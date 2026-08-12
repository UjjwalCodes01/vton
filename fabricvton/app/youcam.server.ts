// YouCam (Perfect Corp) AI Clothes Virtual Try-On API client
// Docs: https://docs.perfectcorp.com/reference/ai_clothes
//
// Flow:
//   1. POST /s2s/v1.0/client/auth             — exchange client credentials for an access token
//   2. POST /s2s/v2.0/file                    — reserve an upload slot → { file_id, requests[] }
//   3. PUT  <requests[0].url>                 — upload the raw image bytes to S3
//   4. POST /s2s/v2.0/task/cloth-v4           — start the try-on → { task_id }
//   5. GET  /s2s/v2.0/task/cloth-v4/{task_id} — poll until task_status is success | error
//
// The garment is passed through as a plain URL (ref_file_url), so Shopify product
// images never need uploading — only the shopper's photo goes through steps 2-3.

import { constants, publicEncrypt } from "node:crypto";

const RAW_BASE_URL =
  process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com";
const BASE_URL = RAW_BASE_URL.replace(/\/$/, "");

const API_KEY = process.env.YOUCAM_API_KEY || "";
const API_SECRET = process.env.YOUCAM_API_SECRET || "";

// cloth-v4 adds outerwear + "auto" category. Override to cloth-v3 / cloth if needed.
const CLOTH_FEATURE = process.env.YOUCAM_CLOTH_FEATURE || "cloth-v4";

// If "auto" is rejected by your plan, set this to upper_body.
const DEFAULT_GARMENT_CATEGORY =
  process.env.YOUCAM_DEFAULT_GARMENT_CATEGORY || "auto";

// ─── Types ────────────────────────────────────────────────

export type YouCamStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface YouCamUpload {
  fileId: string;
}

export interface YouCamTaskStart {
  id: string;
  status: YouCamStatus;
}

export interface YouCamGeneration {
  taskId: string;
  status: YouCamStatus;
  resultImageUrl?: string;
  /** Stable code from the documented error tables, e.g. error_pose */
  errorCode?: string;
  errorMessage?: string;
  /** Server-suggested poll cadence, when provided */
  pollingIntervalMs?: number;
}

/** Thrown so callers can branch on a documented error code rather than a message. */
export class YouCamError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.name = "YouCamError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ─── Auth ─────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * The console hands out the client secret as an RSA public key. It may arrive
 * PEM-wrapped, with escaped newlines, or as a bare base64 body — normalize all three.
 */
function normalizePublicKey(secret: string): string {
  const trimmed = secret.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;

  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function buildIdToken(): string {
  const payload = `client_id=${API_KEY}&timestamp=${Date.now()}`;
  return publicEncrypt(
    {
      key: normalizePublicKey(API_SECRET),
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(payload, "utf8")
  ).toString("base64");
}

/**
 * Returns a bearer token.
 *
 * With YOUCAM_API_SECRET set we run the S2S credential exchange and cache the
 * result. Without it we treat YOUCAM_API_KEY as a ready-to-use bearer token,
 * which is what the v2.0 Bearer-only accounts issue.
 */
export async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!API_KEY) {
    throw new YouCamError(
      "YOUCAM_API_KEY is not configured.",
      "missing_credentials",
      500
    );
  }

  if (!API_SECRET) return API_KEY;

  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const endpoint = `${BASE_URL}/s2s/v1.0/client/auth`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: API_KEY, id_token: buildIdToken() }),
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    throw new YouCamError(
      `YouCam auth failed (${res.status}) at ${endpoint}: ${raw || res.statusText}`,
      "auth_failed",
      res.status
    );
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    throw new YouCamError(
      `YouCam auth returned a non-JSON body: ${raw.slice(0, 200)}`,
      "auth_failed",
      502
    );
  }

  const result = (parsed.result ?? parsed.data ?? parsed) as Record<string, unknown>;
  const token =
    typeof result.access_token === "string"
      ? result.access_token
      : typeof result.id_token === "string"
        ? result.id_token
        : "";

  if (!token) {
    throw new YouCamError(
      "YouCam auth succeeded but no access_token was returned.",
      "auth_failed",
      502
    );
  }

  // Renew a minute early; fall back to 30 minutes when the API omits expires_in.
  const expiresInSec =
    typeof result.expires_in === "number" ? result.expires_in : 1800;
  cachedToken = {
    value: token,
    expiresAt: Date.now() + Math.max(expiresInSec - 60, 60) * 1000,
  };

  return token;
}

// ─── Request helpers ──────────────────────────────────────

async function readError(res: Response): Promise<YouCamError> {
  const raw = await res.text().catch(() => "");
  let code = "unknown_error";
  let message = raw || res.statusText || "Unknown YouCam error";

  try {
    const parsed = JSON.parse(raw) as Partial<{
      error: string;
      error_code: string;
      message: string;
    }>;
    code = parsed.error_code || code;
    message = parsed.message || parsed.error || message;
  } catch {
    // Non-JSON body — keep the raw text.
  }

  return new YouCamError(message, code, res.status);
}

/**
 * Calls the API with a bearer token, retrying once on 401 with a fresh token so
 * an expired cached token never surfaces as a shopper-facing failure.
 */
async function apiFetch(
  path: string,
  init: RequestInit = {},
  allowRetry = true
): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && allowRetry && API_SECRET) {
    cachedToken = null;
    return apiFetch(path, init, false);
  }

  return res;
}

// ─── Step 1-2: Upload the shopper's photo ─────────────────

const UPLOADABLE_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

function normalizeContentType(type: string): string {
  const lowered = (type || "").toLowerCase();
  if (lowered === "image/jpg") return "image/jpeg";
  return UPLOADABLE_CONTENT_TYPES.has(lowered) ? lowered : "image/jpeg";
}

/**
 * Reserves an upload slot, PUTs the bytes, and returns the file_id to pass as
 * src_file_id when creating the task.
 */
export async function uploadCustomerImage(
  file: Blob,
  filename = "customer-photo.jpg"
): Promise<YouCamUpload> {
  const contentType = normalizeContentType(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());

  const reserveRes = await apiFetch("/s2s/v2.0/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: [
        {
          content_type: contentType,
          file_name: filename,
          file_size: bytes.byteLength,
        },
      ],
    }),
  });

  if (!reserveRes.ok) throw await readError(reserveRes);

  const payload = (await reserveRes.json()) as {
    data?: {
      files?: Array<{
        file_id?: string;
        requests?: Array<{
          method?: string;
          url?: string;
          headers?: Record<string, string>;
        }>;
      }>;
    };
  };

  const entry = payload.data?.files?.[0];
  const fileId = entry?.file_id;
  const uploadRequest = entry?.requests?.[0];

  if (!fileId || !uploadRequest?.url) {
    throw new YouCamError(
      "YouCam file reservation did not return a file_id and upload URL.",
      "upload_reserve_failed",
      502
    );
  }

  // Echo back the content type the reservation was made with. Content-Length is
  // a forbidden fetch header — undici derives it from the body, which is exact
  // because we send the same buffer we measured.
  const putRes = await fetch(uploadRequest.url, {
    method: uploadRequest.method || "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(bytes),
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    throw new YouCamError(
      `YouCam image upload failed (${putRes.status}): ${detail.slice(0, 200)}`,
      "upload_failed",
      putRes.status
    );
  }

  return { fileId };
}

// ─── Garment category ─────────────────────────────────────

/**
 * Maps a Shopify product title onto a cloth-v4 garment_category.
 * Order matters: outerwear and full-body keywords win over generic top words.
 */
export function mapGarmentCategory(productTitle: string | null): string {
  const title = (productTitle ?? "").toLowerCase();

  if (/(jacket|coat|blazer|vest|parka|cardigan|overcoat|windbreaker)/.test(title)) {
    return "outerwear";
  }
  if (/(dress|gown|jumpsuit|romper|onesie|overall|robe|kaftan)/.test(title)) {
    return "full_body";
  }
  if (/(jean|pant|trouser|skirt|short|legging|chino|slack|bottom)/.test(title)) {
    return "lower_body";
  }
  if (/(shoe|sneaker|boot|heel|sandal|loafer|trainer)/.test(title)) {
    return "shoes";
  }
  if (/(shirt|tee|t-shirt|top|blouse|sweater|hoodie|sweatshirt|polo|tank|jumper)/.test(title)) {
    return "upper_body";
  }

  return DEFAULT_GARMENT_CATEGORY;
}

// ─── Step 5: Create the try-on task ───────────────────────

export async function createTryOn(params: {
  /** file_id from uploadCustomerImage */
  customerFileId: string;
  /** Public garment image URL (Shopify CDN) */
  garmentImageUrl: string;
  garmentCategory?: string;
}): Promise<YouCamTaskStart> {
  const body: Record<string, unknown> = {
    src_file_id: params.customerFileId,
    ref_file_url: params.garmentImageUrl,
    garment_category: params.garmentCategory || DEFAULT_GARMENT_CATEGORY,
  };

  const res = await apiFetch(`/s2s/v2.0/task/${CLOTH_FEATURE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw await readError(res);

  const payload = (await res.json()) as { data?: { task_id?: string } };
  const taskId = payload.data?.task_id;

  if (!taskId) {
    throw new YouCamError(
      "YouCam task creation succeeded but no task_id was returned.",
      "missing_task_id",
      502
    );
  }

  return { id: taskId, status: "PENDING" };
}

// ─── Step 6-7: Poll ───────────────────────────────────────

function normalizeStatus(status: unknown): YouCamStatus {
  const s = typeof status === "string" ? status.toLowerCase() : "";
  // The docs only document "success", but accept the usual synonyms — treating a
  // finished task as PENDING would make the widget poll until it times out.
  if (s === "success" || s === "completed" || s === "done" || s === "finished") {
    return "COMPLETED";
  }
  if (s === "error" || s === "failed" || s === "failure") return "FAILED";
  if (s === "running" || s === "processing" || s === "in_progress") {
    return "PROCESSING";
  }
  return "PENDING";
}

/**
 * Pulls the result image URL out of the status payload.
 *
 * Documented shape is `results: { url }`, but sibling Perfect Corp endpoints nest
 * it as `results: [{ data: [{ url }] }]`. Walk the plausible shapes rather than
 * silently returning undefined, which would read as "not finished yet".
 */
function extractResultUrl(value: unknown, depth = 0): string | undefined {
  if (!value || depth > 4) return undefined;

  if (typeof value === "string") {
    return value.startsWith("http") ? value : undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractResultUrl(entry, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "download_url", "downloadUrl", "resultImageUrl"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.startsWith("http")) {
        return candidate;
      }
    }
    for (const key of ["data", "results", "result", "files"]) {
      const found = extractResultUrl(record[key], depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

export async function getGenerationStatus(
  taskId: string
): Promise<YouCamGeneration> {
  const res = await apiFetch(
    `/s2s/v2.0/task/${CLOTH_FEATURE}/${encodeURIComponent(taskId)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } }
  );

  if (!res.ok) throw await readError(res);

  const payload = (await res.json()) as {
    data?: {
      task_status?: string;
      polling_interval?: number;
      error?: string | null;
      error_code?: string | null;
      // Shape varies across Perfect Corp endpoints — resolved by extractResultUrl.
      results?: unknown;
    };
  };

  const data = payload.data ?? {};
  const status = normalizeStatus(data.task_status);
  const resultImageUrl = extractResultUrl(data.results);

  // A COMPLETED task with no URL, or a status we don't recognise, both surface to
  // the shopper as an unexplained timeout — log the raw body so they're diagnosable.
  if ((status === "COMPLETED" && !resultImageUrl) || status === "PENDING") {
    console.log(
      `[YouCam][${taskId}] status=${String(data.task_status)} mapped=${status} url=${resultImageUrl ? "yes" : "no"} raw=${JSON.stringify(payload).slice(0, 500)}`
    );
  } else {
    console.log(`[YouCam][${taskId}] status=${String(data.task_status)} mapped=${status}`);
  }

  // On failure the reason arrives in `data.error` as a bare code
  // (e.g. "error_apply_region_mismatch"); `error_code` is not always present.
  // Anything without whitespace is treated as a code so it maps to real copy
  // instead of leaking the raw identifier to the shopper.
  const rawError = typeof data.error === "string" && data.error ? data.error : null;
  const errorCode =
    data.error_code ??
    (rawError && /^[A-Za-z][A-Za-z0-9_.-]*$/.test(rawError) ? rawError : undefined);
  const errorMessage = errorCode
    ? describeYouCamError(errorCode)
    : (rawError ?? undefined);

  return {
    taskId,
    status,
    resultImageUrl: resultImageUrl || undefined,
    errorCode: errorCode || undefined,
    errorMessage: errorMessage || undefined,
    pollingIntervalMs:
      typeof data.polling_interval === "number"
        ? data.polling_interval * 1000
        : undefined,
  };
}

// ─── Error copy ───────────────────────────────────────────

/**
 * Shopper-facing copy for the documented preprocess/engine error codes.
 * Anything unmapped falls through to a generic retry message.
 */
export function describeYouCamError(code: string): string {
  switch (code) {
    case "error_pose":
      return "We couldn't detect a clear pose in your photo. Please stand facing the camera, upright, with your shoulders visible.";
    case "error_invalid_src":
      return "Please upload a photo that shows you from the chest upwards — lower-body-only photos can't be used.";
    case "error_invalid_ref":
      return "This product's image can't be used for try-on right now. Please try a different product.";
    case "error_apply_region_mismatch":
      return "Your photo doesn't show the part of the body this garment covers. Try a photo with more of your body in frame.";
    case "exceed_max_filesize":
      return "That photo is too large. Please use an image under 10MB and no wider than 4096 pixels.";
    case "error_below_min_image_size":
      return "That photo is too small. Please use an image at least 512 pixels on its long side.";
    case "error_nsfw_content_detected":
      return "We couldn't complete this try-on. Please try a different photo.";
    case "error_editing_failed":
      return "The try-on didn't produce a clear result. Please try a different photo or product.";
    case "error_download_image":
      return "We couldn't load the product image. Please try again in a moment.";
    case "invalid_parameter":
      return "This product isn't configured for try-on yet. Please try a different product.";
    case "InvalidAccessToken":
      return "Virtual try-on is temporarily unavailable. Please try again shortly.";
    default:
      return "Try-on generation failed. Please try again.";
  }
}

// ─── Health ───────────────────────────────────────────────

export interface YouCamHealth {
  ok: boolean;
  /** Human-readable status for the super-admin dashboard */
  detail: string;
  feature: string;
  baseUrl: string;
  authMode: "s2s" | "bearer";
}

/**
 * Verifies credentials and reachability by forcing a fresh token exchange.
 *
 * YouCam does not expose a credit-balance endpoint in the AI Clothes API, so
 * this reports connection health only — quota is visible in the YouCam console.
 */
export async function checkProviderHealth(): Promise<YouCamHealth> {
  const base: Omit<YouCamHealth, "ok" | "detail"> = {
    feature: CLOTH_FEATURE,
    baseUrl: BASE_URL,
    authMode: API_SECRET ? "s2s" : "bearer",
  };

  if (!API_KEY) {
    return { ...base, ok: false, detail: "YOUCAM_API_KEY is not set." };
  }

  try {
    await getAccessToken(true);
    return {
      ...base,
      ok: true,
      detail: API_SECRET
        ? "Credentials exchanged successfully."
        : "API key configured (no secret — using direct bearer auth).",
    };
  } catch (error) {
    return {
      ...base,
      ok: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Error codes caused by the shopper's own photo — worth showing verbatim and
 * worth letting them retry, as opposed to server-side faults.
 */
export const SHOPPER_FIXABLE_ERROR_CODES = new Set([
  "error_pose",
  "error_invalid_src",
  "error_apply_region_mismatch",
  "exceed_max_filesize",
  "error_below_min_image_size",
]);
