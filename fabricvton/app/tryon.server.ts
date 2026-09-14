import db from "./db.server";
import { getPlan, isBillingCycleDue } from "./billing.server";
import {
  countInFlightGenerations,
  reclaimStaleReservations,
  releaseReservation,
  reserveTryOnCredit,
  settleSuccessfulReservation,
} from "./credits.server";
import { logInternalError, newRequestId } from "./requestid.server";
import {
  analyticsPingRules,
  checkRateLimits,
  clientIpFrom,
  LIMITS,
  purgeExpiredRateLimitWindows,
  shouldRunPeriodically,
  statusPollRules,
  tryOnGenerationRules,
} from "./ratelimit.server";
import { purgeExpiredData } from "./retention.server";
import {
  clampText,
  dataUrlToBlob,
  declaredBodyTooLarge,
  ImageTooLargeError,
  InvalidImageError,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  sanitizeEmail,
  sanitizeSessionId,
  UnsupportedImageTypeError,
  validateGarmentImageUrl,
} from "./tryon-input.server";
import {
  uploadCustomerImage,
  createTryOn,
  getGenerationStatus,
  mapGarmentCategory,
  describeYouCamError,
  SHOPPER_FIXABLE_ERROR_CODES,
  YouCamError,
} from "./youcam.server";

// ─── CORS ───────────────────────────────────────────────

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });
}

/**
 * The only error shape this endpoint returns.
 *
 * `requestId` is the whole point: the shopper gets a message they can act on, the
 * operator gets the upstream detail in the log under the same id, and nothing
 * about our provider, plan state or infrastructure crosses the boundary. Anything
 * that used to travel in a `debug` field now only exists server-side — see
 * app/requestid.server.ts.
 */
function errorResponse(
  message: string,
  status: number,
  origin: string,
  requestId: string,
  extraHeaders: Record<string, string> = {}
) {
  return jsonResponse({ error: message, requestId }, status, origin, extraHeaders);
}

/**
 * Classifies a provider failure into a shopper-facing message and status.
 *
 * Returns no detail string at all — callers log the raw error themselves via
 * logInternalError, which is what keeps the detail from reaching a response by
 * accident.
 */
function classifyTryOnError(error: unknown, stage: "upload" | "create" | "general") {
  if (error instanceof YouCamError) {
    // Photo problems the shopper can actually fix — 422 so the widget shows the
    // provider's specific guidance rather than a generic server error. These
    // messages come from our own describeYouCamError table, not from upstream.
    if (SHOPPER_FIXABLE_ERROR_CODES.has(error.code)) {
      return { status: 422, message: describeYouCamError(error.code) };
    }

    if (error.code === "InvalidAccessToken" || error.httpStatus === 401) {
      return {
        status: 502,
        message: "Virtual try-on is temporarily unavailable. Please try again shortly.",
      };
    }

    if (error.httpStatus === 402 || error.httpStatus === 429) {
      return {
        status: 402,
        message:
          "Virtual try-on credits have run out. The store owner needs to top up their Clothsy AI plan.",
      };
    }

    return { status: 502, message: describeYouCamError(error.code) };
  }

  return {
    status: stage === "general" ? 500 : 502,
    message:
      stage === "upload"
        ? "Image upload failed. Please try another photo."
        : "Try-on generation failed. Please try again.",
  };
}

// ─── GET /api/tryon — Analytics ping OR status poll ─────
//   ?event=open&shop=...   → analytics ping
//   ?generationId=...      → poll status for async try-on
//
// `shop` is NOT read from the query string here: it is the shop Shopify's app
// proxy signature authenticated, passed down by the route. See
// app/routes/proxy.api.tryon.tsx.

export async function handleTryOnLoader(request: Request, verifiedShop: string) {
  const origin = request.headers.get("Origin") || "*";
  const requestId = newRequestId();
  const url = new URL(request.url);
  const event = url.searchParams.get("event");
  const generationId = clampText(url.searchParams.get("generationId"), 128);
  const clientIp = clientIpFrom(request);

  if (!verifiedShop) {
    return errorResponse("Unauthorized request.", 401, origin, requestId);
  }

  // Status poll: ?generationId=xxx
  if (generationId) {
    // Prefer the widget's own session id, then the forwarded IP. Falling back to
    // the generation id rather than a shared constant matters: a single bucket
    // named "anonymous" would be shared by every shopper on the store, and three
    // concurrent try-ons polling every 3s would throttle each other.
    const sessionKey =
      sanitizeSessionId(url.searchParams.get("sessionId")) ??
      sanitizeSessionId(url.searchParams.get("oseid")) ??
      clientIp ??
      generationId;

    const pollLimit = await checkRateLimits(
      statusPollRules({ shop: verifiedShop, sessionKey })
    );
    if (!pollLimit.allowed) {
      return errorResponse(
        "Too many status checks. Please wait a moment.",
        429,
        origin,
        requestId,
        { "Retry-After": String(pollLimit.retryAfterSeconds) }
      );
    }

    // A generationId is an opaque provider task id, not a capability: knowing one
    // must not be enough to read its result or, worse, to settle its billing
    // against whichever shop owns it. So the event is looked up scoped to the
    // shop this signed request came from, and a miss is indistinguishable from a
    // generation that never existed.
    const tryOnEvent = await db.tryOnEvent.findFirst({
      where: { shop: verifiedShop, providerTaskId: generationId },
      select: { id: true, shop: true, status: true, overageAmount: true },
    });

    if (!tryOnEvent) {
      return errorResponse("Unknown generation.", 404, origin, requestId);
    }

    try {
      const gen = await getGenerationStatus(generationId);
      await syncGenerationOutcome(
        tryOnEvent,
        generationId,
        gen.status,
        gen.errorCode ?? null
      );

      return jsonResponse(
        {
          status: gen.status,
          resultImageUrl: gen.resultImageUrl ?? null,
          // Only our own error table is ever surfaced — never the provider's raw
          // message, which can name endpoints and task internals.
          errorMessage: gen.errorCode ? describeYouCamError(gen.errorCode) : null,
          requestId,
        },
        200,
        origin
      );
    } catch (err) {
      logInternalError(requestId, "status poll", err);
      return errorResponse(
        "Could not check the try-on status. Please try again.",
        502,
        origin,
        requestId
      );
    }
  }

  // Analytics ping: ?event=open
  if (event === "open") {
    const pingLimit = await checkRateLimits(
      analyticsPingRules({ shop: verifiedShop, clientIp })
    );
    if (!pingLimit.allowed) {
      // Silently accepted rather than errored: this is fire-and-forget telemetry
      // and a 429 here would show up as a console error on a merchant's storefront.
      return jsonResponse({ ok: true, requestId }, 200, origin);
    }

    await upsertDailyAnalytics(verifiedShop, { widgetOpens: 1 });
  }

  return jsonResponse({ ok: true, requestId }, 200, origin);
}

// ─── POST /api/tryon — Start async try-on (returns generationId fast) ─

export async function handleTryOnAction(request: Request, verifiedShop: string) {
  const requestId = newRequestId();
  const origin = request.headers.get("Origin") || "*";

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // The shop is whatever Shopify's app-proxy signature covers — never a body or
  // query field. A caller who could name their own shop could spend any
  // merchant's allowance and bill it to their usage cap.
  const shop = verifiedShop;
  if (!shop) {
    return errorResponse("Unauthorized request.", 401, origin, requestId);
  }

  // Refuse an oversized body from its declared length, before reading it.
  if (declaredBodyTooLarge(request)) {
    return errorResponse(
      `Request too large. Photos must be under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`,
      413,
      origin,
      requestId
    );
  }

  console.log(`[TryOn API][${requestId}] Generation requested for ${shop}`);

  // Reservation state, so the catch-all can release a hold if anything after
  // reservation throws.
  let reservedOverage: number | null = null;
  let pendingEventId: string | null = null;

  try {
    const contentType = request.headers.get("Content-Type") || "";

    let email: string | null = null;
    let productId: string | null = null;
    let productTitle: string | null = null;
    let rawProductImageUrl: string | null = null;
    let sessionId: string | null = null;
    let personImage: Blob | null = null;

    try {
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;

        email = sanitizeEmail(body.email);
        productId = clampText(body.productId, 64);
        productTitle = clampText(body.productTitle, 255);
        rawProductImageUrl = clampText(body.productImageUrl, 2048);
        sessionId = sanitizeSessionId(body.sessionId);

        if (typeof body.personImageDataUrl === "string") {
          personImage = dataUrlToBlob(
            body.personImageDataUrl,
            clampText(body.personImageMimeType, 64) ?? undefined
          );
        }
      } else {
        const formData = await request.formData();
        email = sanitizeEmail(formData.get("email"));
        productId = clampText(formData.get("productId"), 64);
        productTitle = clampText(formData.get("productTitle"), 255);
        rawProductImageUrl = clampText(formData.get("productImageUrl"), 2048);
        sessionId = sanitizeSessionId(formData.get("sessionId"));

        const customerImage = formData.get("personImage");
        if (customerImage instanceof Blob) {
          personImage = customerImage;
        }
      }
    } catch (parseError) {
      if (parseError instanceof ImageTooLargeError) {
        return errorResponse(
          `Image too large. Max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`,
          413,
          origin,
          requestId
        );
      }
      if (parseError instanceof UnsupportedImageTypeError) {
        return errorResponse(
          "Unsupported image format. Please upload a JPG or PNG.",
          415,
          origin,
          requestId
        );
      }
      if (parseError instanceof InvalidImageError) {
        return errorResponse(
          "That photo could not be read. Please try another image.",
          400,
          origin,
          requestId
        );
      }
      logInternalError(requestId, "request parse", parseError);
      return errorResponse("Malformed request.", 400, origin, requestId);
    }

    // ── Validate required fields ──
    if (!personImage || personImage.size === 0) {
      return errorResponse("Please choose a photo to try on.", 400, origin, requestId);
    }
    if (personImage.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        `Image too large. Max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`,
        413,
        origin,
        requestId
      );
    }
    if (personImage.type && !ALLOWED_IMAGE_MIME_TYPES.has(personImage.type.toLowerCase())) {
      return errorResponse(
        "Unsupported image format. Please upload a JPG or PNG.",
        415,
        origin,
        requestId
      );
    }
    if (!productId) {
      return errorResponse("Missing product information.", 422, origin, requestId);
    }

    const garment = validateGarmentImageUrl(rawProductImageUrl, shop);
    if (!garment.ok) {
      // The reason names the rejected host, which is useful in a log and useless
      // (at best) to a shopper — so it stays server-side.
      console.warn(
        `[TryOn API][${requestId}] Rejected garment image URL for ${shop}: ${garment.reason}`
      );
      return errorResponse(
        "This product's image can't be used for try-on. Please contact the store.",
        422,
        origin,
        requestId
      );
    }
    const productImageUrl = garment.url;

    // ── Rate limits ──
    // Applied before any DB write or provider call, so a flood costs one indexed
    // upsert per request and nothing else.
    const clientIp = clientIpFrom(request);
    const rateLimit = await checkRateLimits(
      tryOnGenerationRules({ shop, sessionId, clientIp })
    );
    if (!rateLimit.allowed) {
      console.warn(
        `[TryOn API][${requestId}] Rate limited (${rateLimit.label}) for ${shop}`
      );
      return errorResponse(
        "You've made a lot of try-on requests. Please wait a little and try again.",
        429,
        origin,
        requestId,
        { "Retry-After": String(rateLimit.retryAfterSeconds) }
      );
    }

    // ── Shop config ──
    // Auto-create config if missing (fallback for first API request)
    let config = await db.shopConfig.findUnique({ where: { shop } });
    if (!config) {
      try {
        config = await db.shopConfig.create({ data: { shop } });
        console.log(`[TryOn API][${requestId}] Created default ShopConfig for ${shop}`);
      } catch (err) {
        logInternalError(requestId, "shop config create", err);
        return errorResponse(
          "This store's try-on is not set up yet. Please contact the store.",
          403,
          origin,
          requestId
        );
      }
    }

    if (!config.isEnabled) {
      return errorResponse(
        "Virtual Try-On is currently disabled for this store.",
        403,
        origin,
        requestId
      );
    }
    if (config.isSuspended) {
      return errorResponse(
        "This store's Virtual Try-On access has been suspended.",
        403,
        origin,
        requestId
      );
    }

    // Roll the allowance here rather than only on the billing page, so a shop
    // whose merchant never opens the app still gets its monthly reset.
    if (isBillingCycleDue(config.billingCycleStart)) {
      config = await db.shopConfig.update({
        where: { shop },
        data: { creditsUsed: 0, overageReserved: 0, billingCycleStart: new Date() },
      });
      console.log(`[TryOn API][${requestId}] Rolled billing cycle for ${shop}`);
    }

    // Give back credits held by generations that were abandoned mid-flight,
    // otherwise a shop slowly loses its allowance to closed browser tabs.
    await reclaimStaleReservations(shop);

    // ── Concurrency ceiling ──
    // Separate from the rate limits: those bound requests over time, this bounds
    // simultaneous provider work.
    //
    // Deliberately an approximate limit, not an atomic one: count-then-check means
    // a simultaneous burst can overshoot by roughly the number of requests racing
    // here. That is acceptable because this ceiling is not what protects the
    // money — the atomic reservation below is, and it cannot be overshot at all.
    // This exists to keep a single store from monopolising provider throughput,
    // where being a few over briefly costs nothing.
    const inFlight = await countInFlightGenerations(shop);
    if (inFlight >= LIMITS.shopConcurrent) {
      console.warn(
        `[TryOn API][${requestId}] ${shop} at concurrency ceiling (${inFlight}/${LIMITS.shopConcurrent})`
      );
      return errorResponse(
        "This store is processing several try-ons right now. Please try again in a moment.",
        429,
        origin,
        requestId,
        { "Retry-After": "15" }
      );
    }

    // ── Reserve the credit BEFORE any provider work ──
    // This is the atomic step that makes concurrent try-ons safe: the plan
    // allowance and the merchant-approved usage cap are enforced inside a single
    // conditional UPDATE, so N simultaneous requests cannot all pass one shared
    // read of the balance. See app/credits.server.ts.
    const reservation = await reserveTryOnCredit({
      shop,
      plan: config.plan,
      requestId,
    });

    if (!reservation.ok) {
      const plan = getPlan(config.plan);
      console.log(
        `[TryOn API][${requestId}] Reservation refused for ${shop} ` +
          `(plan ${plan.name}): ${reservation.reason}`
      );
      return errorResponse(
        "This store has used all of its virtual try-ons for this month. Please check back next month.",
        429,
        origin,
        requestId
      );
    }
    reservedOverage = reservation.overageAmount;

    const startTime = Date.now();

    // ── Capture lead email if provided ──
    if (email) {
      const leadId = `${shop}:${email}:${productId}`;
      await db.lead.upsert({
        where: { id: leadId },
        create: {
          id: leadId,
          shop,
          email,
          productId,
          productTitle: productTitle ?? undefined,
        },
        update: {
          productTitle: productTitle ?? undefined,
        },
      });
      await upsertDailyAnalytics(shop, { emailsCaptured: 1 });
    }

    // ── Record the pending event that owns the reservation ──
    // Created before the provider call, not after, so the reservation is always
    // attached to a row that the stale sweeper and the concurrency count can see.
    // A crash between here and the provider call leaves a row the sweeper
    // reclaims; the opposite order would leak the credit silently.
    const pendingEvent = await db.tryOnEvent.create({
      data: {
        shop,
        sessionId,
        productId,
        productTitle,
        leadEmail: email,
        status: "pending",
        modelUsed: `youcam/${config.modelVersion}`,
        overageAmount: reservation.overageAmount,
      },
      select: { id: true },
    });
    pendingEventId = pendingEvent.id;

    // ── Upload customer photo to YouCam ──
    let customerFileId: string;
    try {
      const uploadResult = await uploadCustomerImage(personImage);
      customerFileId = uploadResult.fileId;
    } catch (err) {
      logInternalError(requestId, "upload stage", err);
      await failPendingEvent(pendingEventId, shop, reservation.overageAmount, err);
      reservedOverage = null;
      pendingEventId = null;
      const classified = classifyTryOnError(err, "upload");
      return errorResponse(classified.message, classified.status, origin, requestId);
    }

    // ── Start Try-On generation (ASYNC — returns generationId immediately) ──
    let generationId: string;
    const garmentCategory = mapGarmentCategory(productTitle);
    try {
      const tryOnResult = await createTryOn({
        customerFileId,
        garmentImageUrl: productImageUrl,
        garmentCategory,
      });
      generationId = tryOnResult.id;
    } catch (err) {
      logInternalError(requestId, "create stage", err);
      await failPendingEvent(pendingEventId, shop, reservation.overageAmount, err);
      reservedOverage = null;
      pendingEventId = null;
      const classified = classifyTryOnError(err, "create");
      return errorResponse(classified.message, classified.status, origin, requestId);
    }

    await db.tryOnEvent.update({
      where: { id: pendingEventId },
      data: {
        providerTaskId: generationId,
        processingMs: Date.now() - startTime,
      },
    });

    console.log(
      `[TryOn API][${requestId}] Started YouCam task ${generationId} for ${shop} ` +
        `(${garmentCategory}, billed as ${reservation.billedAs})`
    );

    // The reservation now belongs to the pending event; the catch-all below must
    // not release it, or a settled generation would double-refund.
    reservedOverage = null;
    pendingEventId = null;

    // Housekeeping rides along on shopper traffic, at most once per interval
    // across all instances. The app has no scheduler.
    void runHousekeeping();

    // ── Return generationId for client-side polling ──
    // The frontend polls GET /apps/fabricvton/api/tryon?generationId=xxx
    return jsonResponse({ generationId, status: "PENDING", requestId }, 202, origin);
  } catch (err: unknown) {
    logInternalError(requestId, "unhandled route", err);

    // Anything that threw after the reservation was taken must give it back,
    // otherwise a bug permanently burns the merchant's credit.
    if (pendingEventId !== null) {
      await failPendingEvent(pendingEventId, shop, reservedOverage ?? 0, err).catch(
        (releaseError) => logInternalError(requestId, "reservation release", releaseError)
      );
    } else if (reservedOverage !== null) {
      await releaseReservation(shop, reservedOverage).catch((releaseError) =>
        logInternalError(requestId, "reservation release", releaseError)
      );
    }

    const classified = classifyTryOnError(err, "general");
    return errorResponse(classified.message, classified.status, origin, requestId);
  }
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Marks a pending event failed and releases whatever it was holding.
 *
 * The updateMany-on-status is the idempotency guard: only the caller that
 * actually flips the row out of "pending" releases the credit, so a failure path
 * racing the status poller cannot refund twice.
 */
async function failPendingEvent(
  eventId: string,
  shop: string,
  overageAmount: number,
  err: unknown
) {
  const { count } = await db.tryOnEvent.updateMany({
    where: { id: eventId, status: "pending" },
    data: {
      status: "failed",
      errorCode: err instanceof YouCamError ? err.code : null,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    },
  });

  if (count > 0) {
    await releaseReservation(shop, overageAmount);
    await upsertDailyAnalytics(shop, { tryOnsFailed: 1 });
  }
}

async function runHousekeeping() {
  try {
    if (await shouldRunPeriodically("ratelimit-purge", 60 * 60 * 1000)) {
      await purgeExpiredRateLimitWindows();
    }
    if (await shouldRunPeriodically("retention-purge", 24 * 60 * 60 * 1000)) {
      await purgeExpiredData();
    }
  } catch (error) {
    console.error(
      "[Housekeeping] Pass failed:",
      error instanceof Error ? error.message : error
    );
  }
}

async function upsertDailyAnalytics(
  shop: string,
  data: Partial<{
    widgetOpens: number;
    emailsCaptured: number;
    tryOnsCompleted: number;
    tryOnsFailed: number;
  }>
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.analyticsDaily.upsert({
    where: { shop_date: { shop, date: today } },
    create: {
      shop,
      date: today,
      widgetOpens: data.widgetOpens ?? 0,
      emailsCaptured: data.emailsCaptured ?? 0,
      tryOnsCompleted: data.tryOnsCompleted ?? 0,
      tryOnsFailed: data.tryOnsFailed ?? 0,
    },
    update: {
      widgetOpens: { increment: data.widgetOpens ?? 0 },
      emailsCaptured: { increment: data.emailsCaptured ?? 0 },
      tryOnsCompleted: { increment: data.tryOnsCompleted ?? 0 },
      tryOnsFailed: { increment: data.tryOnsFailed ?? 0 },
    },
  });
}

/**
 * Settles the reservation a polled generation was holding.
 *
 * The caller has already confirmed the event belongs to the shop that made the
 * signed request, so billing can never be driven against a shop by someone who
 * merely guessed a task id.
 */
async function syncGenerationOutcome(
  event: { id: string; shop: string; overageAmount: number },
  generationId: string,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  errorCode: string | null
) {
  if (status === "PENDING" || status === "PROCESSING") {
    return;
  }

  if (status === "FAILED") {
    const { count } = await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: {
        status: "failed",
        errorCode,
        errorMessage: errorCode
          ? describeYouCamError(errorCode)
          : "Generation failed on the YouCam side.",
      },
    });

    if (count > 0) {
      // A failed generation is not billable: hand the credit back.
      await releaseReservation(event.shop, event.overageAmount);
      await upsertDailyAnalytics(event.shop, { tryOnsFailed: 1 });
    }

    return;
  }

  const { count } = await db.tryOnEvent.updateMany({
    where: { id: event.id, status: "pending" },
    data: { status: "success", errorCode: null, errorMessage: null },
  });

  // Zero means another poll already settled this generation — the widget polls
  // every 3s, so this is the common case, not an edge one. Bailing here is what
  // stops the same try-on being billed repeatedly.
  if (count === 0) return;

  // The credit was already spent at reservation time; only the overage hold, if
  // any, still needs to become a real Shopify usage record.
  await settleSuccessfulReservation({
    shop: event.shop,
    overageAmount: event.overageAmount,
    generationId,
  });

  await upsertDailyAnalytics(event.shop, { tryOnsCompleted: 1 });
}
