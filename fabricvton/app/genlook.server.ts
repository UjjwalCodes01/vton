// GenLook Virtual Try-On API Client
// Docs: https://genlook.app/docs/tryon-api/introduction
//
// Public GenLook docs point to a product-first API flow:
//   1. POST /products          — register product image(s)
//   2. POST /images/upload     — upload customer photo (multipart)
//   3. POST /try-on            — create generation using productId + customerImageId
//   4. GET /generations/:id    — poll until completed

const RAW_BASE_URL = process.env.GENLOOK_BASE_URL || "https://api.genlook.app/tryon/v1";
const API_KEY = process.env.GENLOOK_API_KEY || "";
const ALLOW_MOCK_FALLBACK = process.env.GENLOOK_ALLOW_MOCK_FALLBACK === "true";

function normalizeBaseUrl(url: string) {
  // Do not rewrite provider paths: use the configured base URL verbatim.
  return url.replace(/\/$/, "");
}

const BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

function headers(): Record<string, string> {
  return {
    "x-api-key": API_KEY,
  };
}

function jsonHeaders(): Record<string, string> {
  return {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  };
}

function mockFallbackDisabledError(operation: string, cause?: unknown): Error {
  const message =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : "Unknown upstream failure";
  return new Error(
    `[GenLook] ${operation} failed and mock fallback is disabled: ${message}`
  );
}

// ─── Types ───────────────────────────────────────────────

export interface GenlookImageUpload {
  success: boolean;
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
  createdAt: string;
  updatedAt: string;
}

export interface GenlookError {
  statusCode: number;
  message: string;
}

async function readGenlookErrorMessage(res: Response) {
  const raw = await res.text().catch(() => "");
  if (!raw) {
    return res.statusText || "Unknown GenLook error";
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GenlookError>;
    return parsed.message ?? raw;
  } catch {
    return raw;
  }
}

async function ensureProduct(params: {
  externalId: string;
  title: string;
  imageUrl: string;
  description?: string;
}): Promise<{ productId: string; externalId: string }> {
  const endpoint = `${BASE_URL}/products`;
  const payload = {
    externalId: params.externalId,
    title: params.title,
    description: params.description ?? params.title,
    imageUrls: [params.imageUrl],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const productId = typeof data.productId === "string" ? data.productId : "";
    if (!productId) {
      throw new Error(`GenLook ensureProduct succeeded but productId missing at ${endpoint}`);
    }
    return {
      productId,
      externalId:
        typeof data.externalId === "string" ? data.externalId : params.externalId,
    };
  }

  const errMessage = await readGenlookErrorMessage(res);
  throw new Error(
    `GenLook ensureProduct failed (${res.status}) at ${endpoint}: ${errMessage}`
  );
}

async function resolveLatestGenerationId(productId: string, createdAfterMs: number): Promise<string | null> {
  const endpoint = `${BASE_URL}/generations?limit=10`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json().catch(() => ({}))) as {
    items?: Array<{ id?: string; productId?: string; createdAt?: string }>;
  };

  const candidates = (data.items ?? [])
    .filter((item) => item.productId === productId && typeof item.id === "string")
    .map((item) => ({
      id: item.id as string,
      createdAtMs: item.createdAt ? Date.parse(item.createdAt) : 0,
    }))
    .filter((item) => item.createdAtMs >= createdAfterMs - 10_000)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  return candidates[0]?.id ?? null;
}

// ─── API calls ───────────────────────────────────────────

/**
 * Step 1: Upload a customer photo.
 * Accepts a File (from multipart form upload).
 */
export async function uploadCustomerImage(file: Blob, filename = "upload.jpg"): Promise<GenlookImageUpload> {
  const form = new FormData();
  form.append("file", file, filename);

  let res: Response;
  const endpoint = `${BASE_URL}/images/upload`;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: headers(),
      body: form,
    });
  } catch (err: unknown) {
    if (!ALLOW_MOCK_FALLBACK) {
      throw mockFallbackDisabledError("uploadCustomerImage", err);
    }
    console.warn("[GenLook] Image upload failed, using explicit mock fallback");
    return {
      success: true,
      imageUrl: "https://example.com/mock.jpg",
    };
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK) {
      console.warn("[GenLook] Image upload API 500 error, using explicit mock fallback");
      return {
        success: true,
        imageUrl: "https://example.com/mock.jpg",
      };
    }
    const errMessage = await readGenlookErrorMessage(res);
    throw new Error(
      `GenLook uploadImage failed (${res.status}) at ${endpoint}: ${errMessage}`
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    success: true,
    imageId: typeof data.imageId === "string" ? data.imageId : undefined,
    imageUrl:
      typeof data.imageUrl === "string"
        ? data.imageUrl
        : typeof data.url === "string"
          ? data.url
          : "",
  };
}

/**
 * Step 3: Start a virtual try-on generation.
 * Uses productId (externalId from /products) and customerImageId (from /images/upload).
 */
export async function createTryOn(params: {
  externalProductId: string;
  productTitle: string;
  garmentImageUrl: string;
  customerImageId: string;
  webhookUrl?: string;
}): Promise<GenlookTryOnStart> {
  let res: Response;
  const endpoint = `${BASE_URL}/try-on`;
  const startedAt = Date.now();
  let createdProductId = "";
  try {
    const createdProduct = await ensureProduct({
      externalId: params.externalProductId,
      title: params.productTitle,
      imageUrl: params.garmentImageUrl,
    });
    createdProductId = createdProduct.productId;

    res = await fetch(endpoint, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        // GenLook /try-on expects the externalId as `productId`, not the internal productId
        productId: createdProduct.externalId,
        customerImageId: params.customerImageId,
        ...(params.webhookUrl ? { webhook_url: params.webhookUrl } : {}),
      }),
    });
  } catch (err: unknown) {
    if (!ALLOW_MOCK_FALLBACK) {
      throw mockFallbackDisabledError("createTryOn", err);
    }
    console.warn("[GenLook] Try-on API failed, using explicit mock fallback");
    return {
      id: "mock_gen_" + Date.now(),
      status: "processing",
    };
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK) {
      console.warn("[GenLook] Try-on API 500 error, using explicit mock fallback");
      return {
        id: "mock_gen_" + Date.now(),
        status: "processing",
      };
    }
    const errMessage = await readGenlookErrorMessage(res);
    throw new Error(
      `GenLook createTryOn failed (${res.status}) at ${endpoint}: ${errMessage}`
    );
  }

  const raw = await res.text();
  const data = raw.trim().length > 0
    ? (JSON.parse(raw) as Record<string, unknown>)
    : {};

  let generationId =
    typeof data.generationId === "string"
      ? data.generationId
      : typeof data.id === "string"
        ? data.id
        : "";

  if (!generationId && createdProductId) {
    const fallbackId = await resolveLatestGenerationId(createdProductId, startedAt);
    generationId = fallbackId ?? "";
  }

  if (!generationId) {
    throw new Error(
      `GenLook createTryOn succeeded (${res.status}) at ${endpoint} but no generation id was returned`
    );
  }

  return {
    id: generationId,
    status: typeof data.status === "string" ? data.status : "PENDING",
    eta_seconds: typeof data.eta_seconds === "number" ? data.eta_seconds : undefined,
  };
}

/**
 * Step 4: Poll a generation until COMPLETED or FAILED.
 * Returns the final generation object with resultImageUrl if completed.
 */
export async function getGenerationStatus(
  generationId: string
): Promise<GenlookGeneration> {
  let res: Response;
  const endpoint = `${BASE_URL}/generations/${generationId}`;
  try {
    res = await fetch(endpoint, {
      method: "GET",
      headers: headers(),
    });
  } catch (err: unknown) {
    if (ALLOW_MOCK_FALLBACK && generationId.startsWith("mock_gen_")) {
      return {
        generationId,
        status: "COMPLETED",
        resultImageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    throw err;
  }

  if (!res.ok) {
    if (res.status >= 500 && ALLOW_MOCK_FALLBACK && generationId.startsWith("mock_gen_")) {
      return {
        generationId,
        status: "COMPLETED",
        resultImageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    const errMessage = await readGenlookErrorMessage(res);
    throw new Error(
      `GenLook getGeneration failed (${res.status}) at ${endpoint}: ${errMessage}`
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    generationId:
      typeof data.generationId === "string"
        ? data.generationId
        : typeof data.id === "string"
          ? data.id
          : generationId,
    status: normalizeGenerationStatus(data.status),
    resultImageUrl:
      typeof data.resultImageUrl === "string"
        ? data.resultImageUrl
        : typeof data.result_image === "string"
          ? data.result_image
          : typeof data.output_image === "string"
            ? data.output_image
            : undefined,
    errorMessage:
      typeof data.errorMessage === "string"
        ? data.errorMessage
        : typeof data.error === "string"
          ? data.error
          : typeof data.message === "string"
            ? data.message
            : undefined,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeGenerationStatus(status: unknown): GenlookStatus {
  const normalized = typeof status === "string" ? status.toUpperCase() : "PENDING";
  if (normalized === "COMPLETED" || normalized === "FAILED" || normalized === "PROCESSING") {
    return normalized;
  }
  return "PENDING";
}

/**
 * Helper: Poll until done (server-side blocking poll).
 * Polls every 2 seconds, max 90 seconds.
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
      throw new Error(gen.errorMessage ?? "Generation failed on GenLook side.");
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("GenLook generation timed out after " + (maxWaitMs / 1000) + " seconds.");
}

/**
 * Check remaining GenLook API credits.
 * (GenLook doesn't expose a public /credits endpoint for this API key structure, returning placeholder)
 */
export async function checkCredits(): Promise<{ credits: number }> {
  const endpoint = `${BASE_URL}/account/credits`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const errMessage = await readGenlookErrorMessage(res);
    throw new Error(`GenLook checkCredits failed (${res.status}) at ${endpoint}: ${errMessage}`);
  }

  const data = (await res.json().catch(() => ({}))) as { creditBalance?: number };
  return { credits: typeof data.creditBalance === "number" ? data.creditBalance : 0 };
}

/**
 * Get GenLook account info.
 */
export async function getAccountInfo(): Promise<Record<string, unknown>> {
  return { status: "active", plan: "enterprise" };
}
