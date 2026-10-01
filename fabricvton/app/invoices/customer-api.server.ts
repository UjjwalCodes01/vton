// Shared pieces of the public try-on API (/api/v1).
//
// Every error the API returns is `{ error, code }` with a stable code, so
// integrations can branch on the code while the message stays free to improve.
// The codes here are the ones published at clothsyai.fabricvton.com/docs/api —
// change them only together with the docs.

import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { AccountApiKey } from "@prisma/client";
import db from "../db.server";
import { PlaygroundError, playgroundRunStatus, playgroundShop, startPlaygroundRun } from "./playground.server";
import { downloadPublicImage, SafetyBlockError, SafetyUnavailableError } from "../safety.server";
import { getObject, putObject, shareStorageConfigured } from "../share/storage.server";
import { macFor, signFor } from "../signing.server";
import { readBodyLimited, readJsonLimited } from "../bodylimit.server";
import { checkRateLimits } from "../ratelimit.server";

export class CustomerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function apiError(status: number, code: string, message: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export function apiJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Where results and poll URLs are served from. */
export function apiBase() {
  return (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
}

/** Largest image the API downloads. */
export const API_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Downloads one of the caller's image URLs and returns it as a data URL.
 *
 * `field` names the request field, so an error says which image was wrong —
 * the safety layer's own messages only ever talk about "the garment".
 */
export async function imageFromUrl(input: unknown, field: "personImageUrl" | "garmentImageUrl") {
  if (typeof input !== "string" || !input.startsWith("https://")) {
    throw new CustomerApiError(400, "INVALID_IMAGE_URL", `${field} must be a public HTTPS URL.`);
  }

  let bytes: Uint8Array;
  try {
    bytes = await downloadPublicImage(input, API_MAX_IMAGE_BYTES);
  } catch (error) {
    if (error instanceof SafetyBlockError && error.code === "safety_image_size") {
      throw new CustomerApiError(413, "IMAGE_TOO_LARGE", `${field} is larger than 4 MB.`);
    }
    if (error instanceof SafetyBlockError) {
      throw new CustomerApiError(
        400,
        "INVALID_IMAGE_URL",
        `${field} must be a public HTTPS URL on the default port, pointing at a public address.`,
      );
    }
    if (error instanceof SafetyUnavailableError) {
      throw new CustomerApiError(
        400,
        "IMAGE_DOWNLOAD_FAILED",
        `${field} could not be downloaded. It must answer with the image itself (HTTP 200, no redirects) within 12 seconds.`,
      );
    }
    throw error;
  }

  const type =
    bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg"
    : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? "image/png"
    : null;
  if (!type) throw new CustomerApiError(400, "UNSUPPORTED_IMAGE", `${field} must be a JPEG or PNG image.`);
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

const SAFETY_CODES: Record<string, [number, string]> = {
  safety_image_format: [400, "UNSUPPORTED_IMAGE"],
  safety_image_size: [413, "IMAGE_TOO_LARGE"],
  safety_single_face: [422, "PERSON_PHOTO_REJECTED"],
  safety_multiple_people: [422, "PERSON_PHOTO_REJECTED"],
  safety_age: [422, "PERSON_PHOTO_REJECTED"],
  safety_content: [422, "IMAGE_REJECTED"],
  safety_public_figure: [422, "IMAGE_REJECTED"],
  safety_garment: [422, "GARMENT_REJECTED"],
  safety_garment_url: [400, "INVALID_IMAGE_URL"],
};

/** Turns anything a run can throw into the API's error shape. */
export function toApiError(error: unknown): Response {
  if (error instanceof CustomerApiError) {
    return apiError(error.status, error.code, error.message, error.status === 429 ? { "Retry-After": "60" } : {});
  }

  if (error instanceof PlaygroundError) {
    if (error.safetyCode && SAFETY_CODES[error.safetyCode]) {
      const [status, code] = SAFETY_CODES[error.safetyCode];
      return apiError(status, code, error.message);
    }
    // The Playground's own wording talks about the Playground; the API gets its own.
    switch (error.status) {
      case 402:
        return apiError(
          402,
          "INSUFFICIENT_CREDITS",
          error.safetyCode === "key_credits" ? "This API key has no try-ons left." : "This account has no credits left.",
        );
      case 403:
        return apiError(403, "CONSENT_REQUIRED", "Send consent: true to confirm the person is an adult who agreed to this.");
      case 404:
        return apiError(404, "NOT_FOUND", "Unknown try-on.");
      case 502:
        return apiError(502, "START_FAILED", "The try-on could not be started. No credit was used.");
      case 503:
        return apiError(503, "UNAVAILABLE", "Try-on is temporarily unavailable. Retry shortly.");
      default:
        return apiError(error.status, "INVALID_REQUEST", error.message);
    }
  }

  if (error instanceof SafetyUnavailableError) {
    return apiError(503, "UNAVAILABLE", "Try-on is temporarily unavailable. Retry shortly.");
  }

  console.error("[customer API] unexpected failure");
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Retry with the same Idempotency-Key.");
}

// ─── Uploaded images ───────────────────────────────────────────────────────
//
// An uploaded photo gets an opaque, signed id instead of a database row: the id
// names the stored file, the account that uploaded it and when it stops working.
// Files sit under looks/, so the bucket's own expiry rule deletes them.

const UPLOAD_TTL_MS = 24 * 3600 * 1000;

function sniff(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" } as const;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: "image/png", ext: "png" } as const;
  return null;
}

/** Reads the image from a multipart `file` field or a raw image body. */
async function uploadedBytes(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  // Multipart framing adds a little on top of the 4 MB image itself.
  const raw = await readBodyLimited(request, API_MAX_IMAGE_BYTES + 64 * 1024);
  if (!raw) throw new CustomerApiError(413, "IMAGE_TOO_LARGE", "file is larger than 4 MB.");

  if (contentType.startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await new Request("http://upload.local/", {
        method: "POST",
        headers: { "content-type": contentType },
        body: new Blob([raw as Uint8Array<ArrayBuffer>]),
      }).formData();
    } catch {
      throw new CustomerApiError(400, "UNSUPPORTED_IMAGE", "Send the image as a multipart form field named file.");
    }
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      throw new CustomerApiError(400, "UNSUPPORTED_IMAGE", "Send the image as a multipart form field named file.");
    }
    return new Uint8Array(await file.arrayBuffer());
  }
  return raw;
}

export async function uploadApiImage(request: Request, key: AccountApiKey) {
  if (!shareStorageConfigured()) throw new CustomerApiError(503, "UNAVAILABLE", "Image uploads are temporarily unavailable.");

  const limit = await checkRateLimits([
    { scope: `customer-api-upload:${key.accountId}`, limit: 30, windowMs: 60_000, label: "API uploads" },
  ]);
  if (!limit.allowed) {
    throw new CustomerApiError(429, "RATE_LIMITED", "Too many uploads. Retry after the Retry-After interval.");
  }

  const bytes = await uploadedBytes(request);
  if (bytes.length === 0) throw new CustomerApiError(400, "UNSUPPORTED_IMAGE", "file is empty.");
  if (bytes.length > API_MAX_IMAGE_BYTES) throw new CustomerApiError(413, "IMAGE_TOO_LARGE", "file is larger than 4 MB.");
  const kind = sniff(bytes);
  if (!kind) throw new CustomerApiError(400, "UNSUPPORTED_IMAGE", "file must be a JPEG or PNG image.");

  const objectKey = `looks/api/${randomBytes(15).toString("base64url")}.${kind.ext}`;
  await putObject(objectKey, Buffer.from(bytes), kind.type);

  const expiresAt = Date.now() + UPLOAD_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ k: objectKey, a: key.accountId, x: expiresAt })).toString("base64url");
  return { id: `img_${payload}.${signFor("upload", payload)}`, expiresAt: new Date(expiresAt).toISOString() };
}

/** The stored image behind an id, as a data URL — only for the account that uploaded it. */
async function imageFromId(id: unknown, accountId: string, field: string) {
  const invalid = () =>
    new CustomerApiError(400, "INVALID_IMAGE_ID", `${field} is unknown, expired, or belongs to another account.`);
  if (typeof id !== "string" || !id.startsWith("img_") || id.length > 600) throw invalid();

  const token = id.slice(4);
  const dot = token.lastIndexOf(".");
  if (dot < 1) throw invalid();
  const payload = token.slice(0, dot);
  const expected = macFor("upload", payload);
  const mac = token.slice(dot + 1);
  if (!expected || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    throw invalid();
  }

  let claims: { k?: string; a?: string; x?: number };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (claims.a !== accountId || !claims.x || claims.x < Date.now() || !claims.k?.startsWith("looks/api/")) throw invalid();

  const object = await getObject(claims.k);
  if (!object) throw invalid();
  const bytes = new Uint8Array(await object.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw invalid();
  return `data:${kind.type};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** One image input: exactly one of the URL field or the id field. */
async function imageInput(body: Record<string, unknown>, accountId: string, which: "person" | "garment") {
  const urlField = `${which}ImageUrl` as const;
  const idField = `${which}ImageId` as const;
  const hasUrl = body[urlField] !== undefined && body[urlField] !== null;
  const hasId = body[idField] !== undefined && body[idField] !== null;
  if (hasUrl === hasId) {
    throw new CustomerApiError(400, "INVALID_IMAGE_URL", `Send exactly one of ${urlField} or ${idField}.`);
  }
  return hasId ? imageFromId(body[idField], accountId, idField) : imageFromUrl(body[urlField], urlField);
}

// ─── Creating and reading try-ons ──────────────────────────────────────────

const pollUrl = (id: string) => `/api/v1/tryons/${id}`;
// Internally a run passes through "starting" and "processing"; callers only
// ever see the three states the docs promise.
const publicStatus = (state: string) => (state === "success" || state === "failed" ? state : "pending");

/** POST /tryons, shared by the async and sync endpoints. */
export async function createApiTryOn(request: Request, key: AccountApiKey): Promise<Response> {
  try {
    const idempotencyKey = request.headers.get("idempotency-key") || "";
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) {
      return apiError(400, "MISSING_IDEMPOTENCY_KEY", "Send an Idempotency-Key header: 8–128 letters, digits, _ or -.");
    }

    // A retry of a request we already have gets that request back, never a second run.
    const existing = await db.accountApiRun.findUnique({
      where: { accountId_idempotencyKey: { accountId: key.accountId, idempotencyKey } },
    });
    if (existing) {
      return apiJson({ id: existing.id, status: publicStatus(existing.state), pollUrl: pollUrl(existing.id) }, 202);
    }

    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    if (body.consent !== true) {
      return apiError(403, "CONSENT_REQUIRED", "Send consent: true to confirm the person is an adult who agreed to this.");
    }
    const limit = await checkRateLimits([
      { scope: `customer-api:${key.accountId}`, limit: 12, windowMs: 60_000, label: "API burst" },
    ]);
    if (!limit.allowed) {
      return apiError(429, "RATE_LIMITED", "Too many try-ons started. Retry after the Retry-After interval.", {
        "Retry-After": String(limit.retryAfterSeconds || 60),
      });
    }
    const base = apiBase();
    if (!base) return apiError(503, "UNAVAILABLE", "Try-on is temporarily unavailable. Retry shortly.");

    const [personImage, garmentImage] = await Promise.all([
      imageInput(body, key.accountId, "person"),
      imageInput(body, key.accountId, "garment"),
    ]);

    const reservation = await db.accountApiRun
      .create({ data: { id: randomUUID(), accountId: key.accountId, apiKeyId: key.id, idempotencyKey } })
      .catch(async (error: unknown) => {
        if ((error as { code?: string }).code !== "P2002") throw error;
        return db.accountApiRun.findUniqueOrThrow({
          where: { accountId_idempotencyKey: { accountId: key.accountId, idempotencyKey } },
        });
      });
    if (reservation.state !== "starting" || reservation.apiKeyId !== key.id || reservation.runId) {
      return apiJson({ id: reservation.id, status: publicStatus(reservation.state), pollUrl: pollUrl(reservation.id) }, 202);
    }
    // Only the creator starts work. Duplicate requests must never spend twice.
    const claimed = await db.accountApiRun.updateMany({
      where: { id: reservation.id, state: "starting" },
      data: { state: "processing" },
    });
    if (!claimed.count) return apiJson({ id: reservation.id, status: "pending", pollUrl: pollUrl(reservation.id) }, 202);

    let run;
    try {
      run = await startPlaygroundRun({
        accountId: key.accountId,
        personImage,
        garmentImage,
        title: body.title,
        publicBase: base,
        consent: true,
        requestId: reservation.id,
        // A key issued with its own allowance pays for its own try-ons.
        chargeKeyId: key.credits !== null ? key.id : null,
      });
    } catch (error) {
      // Nothing started and nothing was charged, so the reservation is released:
      // a retry with the same Idempotency-Key — as the docs advise for 5xx —
      // must be able to try again, not be told forever that it failed.
      await db.accountApiRun.delete({ where: { id: reservation.id } }).catch(() => {});
      throw error;
    }
    // If this update fails, polling recovers the event by requestId; the spent
    // credit remains tied to that event rather than being silently lost.
    await db.accountApiRun.update({ where: { id: reservation.id }, data: { runId: run.taskId, state: "pending" } });
    return apiJson({ id: reservation.id, status: "pending", pollUrl: pollUrl(reservation.id) }, 202);
  } catch (error) {
    return toApiError(error);
  }
}

/** The current state of one try-on, for GET /tryons/:id and the sync endpoint. */
export async function readApiTryOn(accountId: string, id: string): Promise<Response> {
  const row = await db.accountApiRun.findFirst({ where: { id, accountId } });
  if (!row) return apiError(404, "NOT_FOUND", "Unknown try-on.");

  let runId = row.runId;
  if (!runId && row.state === "processing") {
    const event = await db.tryOnEvent.findFirst({
      where: { shop: playgroundShop(accountId), sessionId: row.id },
      select: { id: true },
    });
    if (event) {
      runId = event.id;
      await db.accountApiRun.update({ where: { id: row.id }, data: { runId, state: "pending" } });
    }
  }
  if (!runId) {
    return apiJson({
      id: row.id,
      status: publicStatus(row.state),
      resultUrl: null,
      // Rows from before start failures released their reservation.
      ...(row.state === "failed" ? { message: "The try-on could not be started. No credit was used." } : {}),
    });
  }

  try {
    const result = await playgroundRunStatus(accountId, runId);
    if (result.status !== row.state) {
      await db.accountApiRun.update({ where: { id: row.id }, data: { state: result.status } });
    }
    return apiJson({
      id: row.id,
      status: result.status,
      resultUrl: result.imageToken ? `${apiBase()}/i/${result.imageToken}` : null,
      ...(result.status === "failed" ? { message: result.message } : {}),
    });
  } catch (error) {
    return toApiError(error);
  }
}
