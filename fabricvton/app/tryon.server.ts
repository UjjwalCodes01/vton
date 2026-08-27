import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "./db.server";
import { chargeOverage, getOverageAvailability, getPlan, isBillingCycleDue } from "./billing.server";
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

function jsonResponse(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function normalizeProductImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}

// YouCam accepts jpg and png only. The widget canvas-encodes everything to JPEG
// before upload, so this only narrows the direct multipart path.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

function classifyTryOnError(error: unknown, stage: "upload" | "create" | "general") {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (error instanceof YouCamError) {
    // Photo problems the shopper can actually fix — 422 so the widget shows the
    // provider's specific guidance rather than a generic server error.
    if (SHOPPER_FIXABLE_ERROR_CODES.has(error.code)) {
      return {
        status: 422,
        message: describeYouCamError(error.code),
        code: error.code,
        debug: raw,
      };
    }

    if (error.code === "InvalidAccessToken" || error.httpStatus === 401) {
      return {
        status: 502,
        message: "Virtual try-on is temporarily unavailable. Please try again shortly.",
        code: error.code,
        debug: raw,
      };
    }

    if (error.httpStatus === 402 || error.httpStatus === 429) {
      return {
        status: 402,
        message:
          "Virtual try-on credits have run out. The store owner needs to top up their FabricVTON plan.",
        code: error.code,
        debug: raw,
      };
    }

    return {
      status: 502,
      message: describeYouCamError(error.code),
      code: error.code,
      debug: raw,
    };
  }

  return {
    status: stage === "general" ? 500 : 502,
    message:
      stage === "upload"
        ? "Image upload failed. Please try another photo."
        : "Try-on generation failed. Please try again.",
    code: undefined,
    debug: raw,
  };
}

// ─── GET /api/tryon — Analytics ping OR status poll ─────
//   ?event=open&shop=...   → analytics ping
//   ?generationId=...      → poll status for async try-on

export async function handleTryOnLoader(request: Request) {
  const origin = request.headers.get("Origin") || "*";
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const event = url.searchParams.get("event");
  const generationId = url.searchParams.get("generationId");

  // Status poll: ?generationId=xxx
  if (generationId) {
    try {
      const gen = await getGenerationStatus(generationId);
      await syncGenerationOutcome(
        generationId,
        gen.status,
        gen.errorMessage ?? null,
        gen.errorCode ?? null
      );
      return jsonResponse(
        {
          status: gen.status,
          resultImageUrl: gen.resultImageUrl ?? null,
          errorMessage: gen.errorCode
            ? describeYouCamError(gen.errorCode)
            : (gen.errorMessage ?? null),
        },
        200,
        origin
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Status check failed";
      return jsonResponse({ error: msg }, 500, origin);
    }
  }

  // Analytics ping: ?event=open&shop=xxx
  if (shop && event === "open") {
    await upsertDailyAnalytics(shop, { widgetOpens: 1 });
  }

  return jsonResponse({ ok: true }, 200, origin);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleTryOnLoader(request);
};

// ─── POST /api/tryon — Start async try-on (returns generationId fast) ─

export async function handleTryOnAction(request: Request) {
  const reqUrl = new URL(request.url);
  const requestId = reqUrl.searchParams.get("oseid") || reqUrl.searchParams.get("cb") || `req_${Date.now().toString(36)}`;
  console.log(`[TryOn API][${requestId}] ================= RECEIVED TRYON REQUEST =================`);
  const origin = request.headers.get("Origin") || "*";

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    const contentType = request.headers.get("Content-Type") || "";
    console.log("[TryOn API] Incoming content type:", contentType);

    // ALWAYS extract shop from URL params first (Shopify app proxy context adds this)
    const url = reqUrl;
    const shopFromUrl = url.searchParams.get("shop") || "";

    let shop = shopFromUrl;

    let email = "";
    let productId: string | null = null;
    let productTitle: string | null = null;
    let productImageUrl: string | null = null;
    let sessionId: string | null = null;
    let personImage: Blob | null = null;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        shop?: string;
        email?: string;
        productId?: string | null;
        productTitle?: string | null;
        productImageUrl?: string | null;
        sessionId?: string | null;
        personImageDataUrl?: string | null;
        personImageMimeType?: string | null;
      };

      // Fallback to body shop only if not in URL
      shop = shopFromUrl || String(body.shop || "");
      email = String(body.email || "").trim().toLowerCase();
      productId = body.productId ?? null;
      productTitle = body.productTitle ?? null;
      productImageUrl = body.productImageUrl ?? null;
      sessionId = body.sessionId ?? null;

      if (body.personImageDataUrl) {
        personImage = dataUrlToBlob(
          body.personImageDataUrl,
          body.personImageMimeType || undefined
        );
      }
    } else {
      console.log("[TryOn API] Parsing multipart form-data payload");
      const formData = await request.formData();
      // Fallback to form data shop only if not in URL
      shop = shopFromUrl || String(formData.get("shop") || "");
      email = String(formData.get("email") || "").trim().toLowerCase();
      productId = formData.get("productId") as string | null;
      productTitle = formData.get("productTitle") as string | null;
      productImageUrl = formData.get("productImageUrl") as string | null;
      sessionId = formData.get("sessionId") as string | null;
      const customerImage = formData.get("personImage");

      if (customerImage instanceof Blob) {
        personImage = customerImage;
      }
    }

    console.log(`[TryOn API][${requestId}] Parsed request metadata`, {
      shop,
      productId,
      hasEmail: Boolean(email),
      hasProductImageUrl: Boolean(productImageUrl),
      hasPersonImage: Boolean(personImage),
      personImageSize: personImage?.size ?? 0,
      personImageType: personImage?.type ?? "unknown",
    });

    // ── Validate required fields ──
    if (!shop) {
      return jsonResponse({ error: "Missing required field: shop" }, 400, origin);
    }
    if (!personImage || personImage.size === 0) {
      return jsonResponse({ error: "Missing required field: personImage" }, 400, origin);
    }
    if (personImage.size > 10 * 1024 * 1024) {
      return jsonResponse({ error: "Image too large. Max 10MB." }, 400, origin);
    }
    if (personImage.type && !ALLOWED_IMAGE_MIME_TYPES.has(personImage.type.toLowerCase())) {
      return jsonResponse({ error: "Unsupported image format. Please upload JPG, PNG, or WebP." }, 415, origin);
    }
    productImageUrl = normalizeProductImageUrl(productImageUrl ?? "");

    if (!productId || !productImageUrl) {
      return jsonResponse({ error: "Missing productId or productImageUrl." }, 422, origin);
    }

    // ── 1. Check shop config ──
    // Auto-create config if missing (fallback for first API request)
    let config = await db.shopConfig.findUnique({ where: { shop } });
    if (!config) {
      console.log("[TryOn API] ShopConfig not found for", shop, "- creating default config");
      try {
        config = await db.shopConfig.create({
          data: { shop }
        });
        console.log("[TryOn API] Created default ShopConfig for", shop);
      } catch (err) {
        console.error("[TryOn API] Failed to create ShopConfig:", err);
        return jsonResponse(
          { error: "Failed to initialize shop configuration. Please visit the app dashboard first." },
          403,
          origin
        );
      }
    }


    if (!config.isEnabled) {
      return jsonResponse(
        { error: "Virtual Try-On is currently disabled for this store." },
        403,
        origin
      );
    }
    if (config.isSuspended) {
      return jsonResponse(
        { error: "This store's Virtual Try-On access has been suspended." },
        403,
        origin
      );
    }

    // ── 2. Check credit balance ──
    // Roll the allowance here rather than only on the billing page, so a shop
    // whose merchant never opens the app still gets its monthly reset.
    if (isBillingCycleDue(config.billingCycleStart)) {
      config = await db.shopConfig.update({
        where: { shop },
        data: { creditsUsed: 0, billingCycleStart: new Date() },
      });
      console.log(`[TryOn API][${requestId}] Rolled billing cycle for ${shop}`);
    }

    // Allowance spent? Try-ons can continue only if Shopify can actually bill
    // for them — i.e. the merchant's subscription carries a usage-charge meter
    // and still has headroom under the cap they approved. Without that, the
    // allowance is a hard cap: generating anyway would mean paying the provider
    // for work nobody is charged for.
    const creditsRemaining = config.monthlyCredits - config.creditsUsed;
    if (creditsRemaining <= 0) {
      const plan = getPlan(config.plan);
      const overage =
        plan.overagePrice > 0
          ? await getOverageAvailability(shop)
          : { available: false, reason: "Plan has no overage pricing", remainingCap: 0 };

      if (!overage.available || overage.remainingCap < plan.overagePrice) {
        console.log(
          `[TryOn API][${requestId}] Allowance exhausted for ${shop}; overage unavailable: ${overage.reason ?? "cap reached"}`
        );
        return jsonResponse(
          {
            error:
              "This store has used all of its virtual try-ons for this month. Please check back next month.",
          },
          429,
          origin
        );
      }

      console.log(
        `[TryOn API][${requestId}] ${shop} over allowance — billing this try-on at $${plan.overagePrice.toFixed(2)} ($${overage.remainingCap.toFixed(2)} cap remaining)`
      );
    }

    // Provider-side credit exhaustion surfaces as a 402/429 on the task call and
    // is mapped by classifyTryOnError — no preflight round-trip needed here.
    const startTime = Date.now();

    // ── 3. Capture lead email if provided ──
    if (email && email.includes("@")) {
      const leadId = `${shop}:${email}:${productId ?? "general"}`;
      await db.lead.upsert({
        where: { id: leadId },
        create: {
          id: leadId,
          shop,
          email,
          productId: productId ?? undefined,
          productTitle: productTitle ?? undefined,
        },
        update: {
          productTitle: productTitle ?? undefined,
        },
      });
      await upsertDailyAnalytics(shop, { emailsCaptured: 1 });
    }

    // ── 4. Upload customer photo to YouCam ──
    let customerFileId: string;
    try {
      const uploadResult = await uploadCustomerImage(personImage);
      customerFileId = uploadResult.fileId;
      console.log(`[TryOn API][${requestId}] Uploaded customer image to YouCam`, {
        fileId: customerFileId,
      });
    } catch (err) {
      await logFailedEvent(shop, sessionId, productId, productTitle, email, startTime, err);
      const classified = classifyTryOnError(err, "upload");
      console.error(`[TryOn API][${requestId}] Upload stage failed:`, classified.debug);
      return jsonResponse({ error: classified.message, debug: classified.debug }, classified.status, origin);
    }

    // ── 5. Start Try-On generation (ASYNC — returns generationId immediately) ──
    let generationId: string;
    const garmentCategory = mapGarmentCategory(productTitle);
    try {
      const tryOnResult = await createTryOn({
        customerFileId,
        garmentImageUrl: productImageUrl,
        garmentCategory,
      });
      generationId = tryOnResult.id;
      console.log(`[TryOn API][${requestId}] Started YouCam task`, {
        generationId,
        garmentCategory,
      });
    } catch (err) {
      await logFailedEvent(shop, sessionId, productId, productTitle, email, startTime, err);
      const classified = classifyTryOnError(err, "create");
      console.error(`[TryOn API][${requestId}] Create stage failed:`, classified.debug);
      return jsonResponse({ error: classified.message, debug: classified.debug }, classified.status, origin);
    }

    // ── 6. Log pending event (will be marked success when we confirm via polling) ──
    await db.tryOnEvent.create({
      data: {
        shop,
        sessionId,
        productId,
        productTitle,
        leadEmail: email || null,
        status: "pending",
        modelUsed: `youcam/${config.modelVersion}`,
        processingMs: Date.now() - startTime,
        providerTaskId: generationId,
      },
    });

    // ── 7. Return generationId for client-side polling ──
    // The frontend will poll GET /apps/fabricvton/api/tryon?generationId=xxx
    return jsonResponse({ generationId, status: "PENDING" }, 202, origin);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`[TryOn API][${requestId}] Unhandled route error:`, err.message);
      console.error(err.stack);
    } else {
      console.error(`[TryOn API][${requestId}] Unhandled route error:`, err);
    }

    const classified = classifyTryOnError(err, "general");

    return jsonResponse(
      { error: classified.message, debug: classified.debug },
      classified.status,
      request.headers.get("Origin") || "*"
    );
  }
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType = "image/jpeg") {
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data received from storefront");
  }

  const mimeType = match[1] || fallbackMimeType;
  const buffer = Buffer.from(match[2], "base64");
  return new Blob([buffer], { type: mimeType });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleTryOnAction(request);
};

// ─── Helpers ────────────────────────────────────────────

async function logFailedEvent(
  shop: string,
  sessionId: string | null,
  productId: string | null,
  productTitle: string | null,
  email: string,
  startTime: number,
  err: unknown,
  providerTaskId?: string
) {
  const errorMessage =
    err instanceof Error ? err.message : "Unknown error";

  await db.tryOnEvent.create({
    data: {
      shop,
      sessionId,
      productId,
      productTitle,
      leadEmail: email || null,
      status: "failed",
      processingMs: Date.now() - startTime,
      errorCode: err instanceof YouCamError ? err.code : null,
      errorMessage,
      providerTaskId: providerTaskId ?? null,
    },
  });

  await upsertDailyAnalytics(shop, { tryOnsFailed: 1 });
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

async function syncGenerationOutcome(
  generationId: string,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  errorMessage: string | null,
  errorCode: string | null = null
) {
  if (status === "PENDING" || status === "PROCESSING") {
    return;
  }

  const event = await db.tryOnEvent.findFirst({
    where: { providerTaskId: generationId },
  });

  if (!event) {
    return;
  }

  if (status === "FAILED") {
    const updateResult = await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: {
        status: "failed",
        errorCode,
        errorMessage: errorMessage ?? "Generation failed on the YouCam side.",
      },
    });

    if (updateResult.count > 0) {
      await upsertDailyAnalytics(event.shop, { tryOnsFailed: 1 });
    }

    return;
  }

  const updateResult = await db.tryOnEvent.updateMany({
    where: { id: event.id, status: "pending" },
    data: {
      status: "success",
      errorCode: null,
      errorMessage: null,
    },
  });

  if (updateResult.count === 0) {
    return;
  }

  const config = await db.shopConfig.update({
    where: { shop: event.shop },
    data: { creditsUsed: { increment: 1 } },
  });

  // Bill only try-ons that actually completed, and only past the allowance.
  const plan = getPlan(config.plan);
  if (config.creditsUsed > config.monthlyCredits && plan.overagePrice > 0) {
    const result = await chargeOverage({
      shop: event.shop,
      amount: plan.overagePrice,
      description: `Try-on beyond monthly allowance (${generationId})`,
    });

    if (result.charged) {
      await db.shopConfig.update({
        where: { shop: event.shop },
        data: { overageChargesTotal: { increment: plan.overagePrice } },
      });
    } else {
      console.warn(
        `[Billing] Overage not charged for ${event.shop}: ${result.reason ?? "unknown"}`
      );
    }
  }

  await upsertDailyAnalytics(event.shop, { tryOnsCompleted: 1 });
}
