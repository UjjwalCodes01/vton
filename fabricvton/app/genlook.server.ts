// GenLook Virtual Try-On API Client
// Docs: https://genlook.app/docs/tryon-api/introduction
// API Version: 1.2.0
//
// Flow:
//   1. POST /images/upload      — upload customer photo → returns { imageId }
//   2. POST /try-on             — inline product + customer: { id } → returns { generationId }
//   3. GET  /generations/:id    — poll until COMPLETED or FAILED

const RAW_BASE_URL =
  process.env.GENLOOK_BASE_URL || "https://api.genlook.app/tryon/v1";
const API_KEY = process.env.GENLOOK_API_KEY || "";
const ALLOW_MOCK_FALLBACK = process.env.GENLOOK_ALLOW_MOCK_FALLBACK === "true";

const BASE_URL = RAW_BASE_URL.replace(/\/$/, "");

// ─── Headers ─────────────────────────────────────────────

function headers(): Record<string, string> {
  return { "x-api-key": API_KEY };
}

function jsonHeaders(): Record<string, string> {
  return { "x-api-key": API_KEY, "Content-Type": "application/json" };
}

// ─── Error helpers ────────────────────────────────────────

async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  if (!raw) return res.statusText || "Unknown GenLook error";
  try {
    // v1.0.0+ unified error shape: { code, message, status, details? }
    const parsed = JSON.parse(raw) as Partial<{ code: string; message: string }>;
    return parsed.message ?? raw;
  } catch {
    return raw;
  }
}

function mockFallbackDisabledError(op: string, cause?: unknown): Error {
  const msg =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : "Unknown upstream failure";
  return new Error(`[GenLook] ${op} failed and mock fallback is disabled: ${msg}`);
}

// ─── Public types ─────────────────────────────────────────

export interface GenlookImageUpload {
  success: boolean;
  /** imageId to pass as customer.id in POST /try-on */
  imageId?: string;
  imageUrl: string;
}

export interface GenlookTryOnStart {
  id: string;
  status: string;
  eta_seconds?: number;
}

export type GenlookStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface GenlookGeneration {
  generationId: string;
  status: GenlookStatus;
  resultImageUrl?: string;
  errorMessage?: string;
  /** Stable error code (e.g. PRODUCT_IMAGE_FETCH_FAILED) — available in v1.1.0+ */
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenlookError {
  statusCode: number;
  message: string;
}

// ─── Step 1: Upload customer image ───────────────────────

/**
 * Upload a customer photo.
 * Returns imageId which must be passed as customer.id to POST /try-on.
 */
export async function uploadCustomerImage(
  file: Blob,
  filename = "upload.jpg"
): Promise<GenlookImageUpload> {
  const form = new FormData();
  form.append("file", file, filename);

  const endpoint = `${BASE_URL}/images/upload`;
  let res: Response;

  try {
    res = await fetch(endpoint, { method: "POST", headers: headers(), body: form });
  } catch (err) {
    if (!ALLOW_MOCK_FALLBACK) throw mockFallbackDisabledError("uploadCustomerImage", err);
    console.warn("[GenLook] Image upload network error — using mock fallback");
    return { success: true, imageUrl: "https://example.com/mock.jpg" };
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK) {
      console.warn("[GenLook] Image upload 500 — using mock fallback");
      return { success: true, imageUrl: "https://example.com/mock.jpg" };
    }
    const msg = await readErrorMessage(res);
    throw new Error(`GenLook uploadImage failed (${res.status}) at ${endpoint}: ${msg}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  // v1.0.0+ response: { imageId, imageUrl }
  const imageId = typeof data.imageId === "string" ? data.imageId : undefined;
  const imageUrl =
    typeof data.imageUrl === "string"
      ? data.imageUrl
      : typeof data.url === "string"
        ? data.url
        : "";

  return { success: true, imageId, imageUrl };
}

// ─── Step 2: Create try-on (inline product) ──────────────

/**
 * Start a virtual try-on generation.
 *
 * Uses the v1.0.0+ "inline product" shape so we do not need a separate
 * POST /products call. The product is upserted from externalProductId.
 *
 * customer must be the imageId returned by uploadCustomerImage.
 */
export async function createTryOn(params: {
  externalProductId: string;
  productTitle: string;
  garmentImageUrl: string;
  customerImageId: string;
  webhookUrl?: string;
}): Promise<GenlookTryOnStart> {
  const endpoint = `${BASE_URL}/try-on`;

  // v1.0.0+ body:
  //   product: { externalId, title, images: [{ url }] }
  //   customer: { id }
  const body: Record<string, unknown> = {
    product: {
      externalId: params.externalProductId,
      title: params.productTitle,
      images: [{ url: params.garmentImageUrl }],
    },
    customer: { id: params.customerImageId },
  };
  if (params.webhookUrl) {
    body.webhook_url = params.webhookUrl;
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (!ALLOW_MOCK_FALLBACK) throw mockFallbackDisabledError("createTryOn", err);
    console.warn("[GenLook] Try-on network error — using mock fallback");
    return { id: "mock_gen_" + Date.now(), status: "processing" };
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK) {
      console.warn("[GenLook] Try-on 500 — using mock fallback");
      return { id: "mock_gen_" + Date.now(), status: "processing" };
    }
    const msg = await readErrorMessage(res);
    throw new Error(`GenLook createTryOn failed (${res.status}) at ${endpoint}: ${msg}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  // v1.0.0+ response: { generationId, status, ... }
  const generationId =
    typeof data.generationId === "string"
      ? data.generationId
      : typeof data.id === "string"
        ? data.id
        : "";

  if (!generationId) {
    throw new Error(
      `GenLook createTryOn succeeded (${res.status}) but no generationId was returned`
    );
  }

  return {
    id: generationId,
    status: typeof data.status === "string" ? data.status : "PENDING",
    eta_seconds: typeof data.eta_seconds === "number" ? data.eta_seconds : undefined,
  };
}

// ─── Step 3: Poll generation status ──────────────────────

/**
 * Fetch the current status of a generation.
 * v1.0.0+: response has { generationId, status, resultImageUrl, errorCode, errorMessage }
 * Note: resultImageKey was removed in v1.0.0 — use resultImageUrl.
 */
export async function getGenerationStatus(
  generationId: string
): Promise<GenlookGeneration> {
  const endpoint = `${BASE_URL}/generations/${generationId}`;
  let res: Response;

  try {
    res = await fetch(endpoint, { method: "GET", headers: headers() });
  } catch (err) {
    if (ALLOW_MOCK_FALLBACK && generationId.startsWith("mock_gen_")) {
      return mockCompletedGeneration(generationId);
    }
    throw err;
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK && generationId.startsWith("mock_gen_")) {
      return mockCompletedGeneration(generationId);
    }
    const msg = await readErrorMessage(res);
    throw new Error(`GenLook getGeneration failed (${res.status}) at ${endpoint}: ${msg}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  return {
    generationId:
      typeof data.generationId === "string"
        ? data.generationId
        : typeof data.id === "string"
          ? data.id
          : generationId,
    status: normalizeStatus(data.status),
    // v1.0.0+: resultImageUrl (resultImageKey was removed)
    resultImageUrl:
      typeof data.resultImageUrl === "string"
        ? data.resultImageUrl
        : typeof data.result_image === "string"
          ? data.result_image
          : undefined,
    // v1.1.0+: stable errorCode alongside errorMessage
    errorCode:
      typeof data.errorCode === "string" ? data.errorCode : undefined,
    errorMessage:
      typeof data.errorMessage === "string"
        ? data.errorMessage
        : typeof data.error === "string"
          ? data.error
          : typeof data.message === "string"
            ? data.message
            : undefined,
    createdAt:
      typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

function normalizeStatus(status: unknown): GenlookStatus {
  const s = typeof status === "string" ? status.toUpperCase() : "PENDING";
  if (s === "COMPLETED" || s === "FAILED" || s === "PROCESSING") return s;
  return "PENDING";
}

function mockCompletedGeneration(generationId: string): GenlookGeneration {
  return {
    generationId,
    status: "COMPLETED",
    resultImageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Blocking poll helper ─────────────────────────────────

/**
 * Poll until COMPLETED or FAILED. Max 90 seconds, 2 second interval.
 */
export async function pollUntilDone(
  generationId: string,
  maxWaitMs = 90_000,
  intervalMs = 2_000
): Promise<GenlookGeneration> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const gen = await getGenerationStatus(generationId);
    if (gen.status === "COMPLETED") return gen;
    if (gen.status === "FAILED") {
      // Prefer stable errorCode if available (v1.1.0+)
      const reason = gen.errorCode
        ? `${gen.errorCode}: ${gen.errorMessage ?? "no details"}`
        : gen.errorMessage ?? "Generation failed on GenLook side.";
      throw new Error(reason);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `GenLook generation timed out after ${maxWaitMs / 1000} seconds.`
  );
}

// ─── Credits / Account ────────────────────────────────────

/**
 * Check remaining GenLook API credits.
 */
export async function checkCredits(): Promise<{ credits: number }> {
  const endpoint = `${BASE_URL}/account/credits`;
  const res = await fetch(endpoint, { method: "GET", headers: headers() });
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new Error(`GenLook checkCredits failed (${res.status}) at ${endpoint}: ${msg}`);
  }
  const data = (await res.json().catch(() => ({}))) as { creditBalance?: number };
  return { credits: typeof data.creditBalance === "number" ? data.creditBalance : 0 };
}

/**
 * Get GenLook account info (placeholder).
 */
export async function getAccountInfo(): Promise<Record<string, unknown>> {
  return { status: "active", plan: "enterprise" };
}
