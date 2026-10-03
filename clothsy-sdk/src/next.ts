/**
 * Server-side route handlers for Next.js (App Router) and any runtime with Web
 * `Request`/`Response`. Keeps your API key on the server and resolves product
 * images on the server, so shoppers can't point a try-on at arbitrary images.
 *
 * ```ts
 * // app/api/tryon/route.ts
 * import { createTryOnRoute } from "clothsy-ai/next";
 *
 * export const maxDuration = 60; // optional, on Vercel
 * export const { POST, GET } = createTryOnRoute({
 *   resolveProduct: async (productId) => {
 *     const product = await db.product.find(productId);
 *     return product ? { imageUrl: product.imageUrl, title: product.name } : null;
 *   },
 * });
 * ```
 */
import { Clothsy, MAX_IMAGE_BYTES } from "./client.js";
import { ClothsyError, RateLimitError, ValidationError, friendlyMessage } from "./errors.js";
import type { ClothsyOptions } from "./types.js";

export interface ResolvedProduct {
  /** Public HTTPS URL of the garment image. */
  imageUrl: string;
  /** Optional label for the try-on (≤120 chars; longer titles are trimmed). */
  title?: string;
}

export interface TryOnRouteOptions {
  /** Defaults to `process.env.CLOTHSY_API_KEY`. */
  apiKey?: string;
  /** Override the API base URL. */
  baseUrl?: string;
  /** Custom fetch (mainly for tests). */
  fetch?: ClothsyOptions["fetch"];
  /** Use an existing client instead of creating one. */
  client?: Clothsy;
  /**
   * Look up a product on the server. Return `null` for unknown products or
   * products that shouldn't offer try-on. Never trust image URLs from the browser.
   */
  resolveProduct: (productId: string, request: Request) => Promise<ResolvedProduct | null> | ResolvedProduct | null;
}

export interface TryOnRouteHandlers {
  POST: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
}

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
const TRYON_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

/** Create `POST` (start a try-on) and `GET` (check status) route handlers. */
export function createTryOnRoute(options: TryOnRouteOptions): TryOnRouteHandlers {
  if (!options || typeof options.resolveProduct !== "function") {
    throw new TypeError("createTryOnRoute: `resolveProduct(productId, request)` is required.");
  }
  // Created lazily so `next build` works without the env var being set.
  let client: Clothsy | undefined = options.client;
  const getClient = () =>
    (client ??= new Clothsy({ apiKey: options.apiKey, baseUrl: options.baseUrl, fetch: options.fetch }));
  // Status checks don't retry here: the browser polls again anyway, and waiting
  // out a Retry-After inside the route would hold each poll open for up to a minute.
  // A client passed in is used as given.
  let pollClient: Clothsy | undefined = options.client;
  const getPollClient = () =>
    (pollClient ??= new Clothsy({ apiKey: options.apiKey, baseUrl: options.baseUrl, fetch: options.fetch, maxRetries: 0 }));

  async function POST(request: Request): Promise<Response> {
    try {
      if (!isSameOrigin(request)) return json({ message: "This request isn't allowed." }, 403);

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return json({ message: "Please upload a photo to try this on." }, 400);
      }

      const photo = form.get("photo");
      const productId = form.get("productId");
      const consent = form.get("consent");
      const requestId = form.get("requestId");

      if (!isBlob(photo) || photo.size === 0) return json({ message: "Please upload a photo to try this on." }, 400);
      if (photo.size > MAX_IMAGE_BYTES || (photo.type && !IMAGE_TYPES.has(photo.type))) {
        return json({ message: "Please upload a JPEG or PNG photo under 4 MB." }, photo.size > MAX_IMAGE_BYTES ? 413 : 415);
      }
      if (consent !== "true") {
        return json({ message: "Please confirm you agree to your photo being processed to create the try-on." }, 400);
      }
      if (typeof productId !== "string" || productId.trim() === "" || productId.length > 256) {
        return json({ message: "This product isn't available for virtual try-on." }, 400);
      }
      if (typeof requestId !== "string" || !REQUEST_ID_RE.test(requestId)) {
        return json({ message: "Something went wrong. Please refresh the page and try again." }, 400);
      }

      const product = await options.resolveProduct(productId.trim(), request);
      if (!product || typeof product.imageUrl !== "string" || !product.imageUrl) {
        return json({ message: "This product isn't available for virtual try-on." }, 404);
      }

      const clothsy = getClient();
      const contentType = IMAGE_TYPES.has(photo.type) ? (photo.type as "image/jpeg" | "image/png") : undefined;
      const image = await clothsy.images.upload(photo, { contentType });
      const created = await clothsy.tryons.create({
        person: { imageId: image.id },
        garment: { url: product.imageUrl },
        title: product.title ? product.title.slice(0, 120) : undefined,
        consent: true,
        idempotencyKey: requestId,
      });
      return json({ id: created.id }, 202);
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function GET(request: Request): Promise<Response> {
    try {
      const id = new URL(request.url).searchParams.get("id");
      if (!id || !TRYON_ID_RE.test(id)) return json({ message: "A try-on id is required." }, 400);
      const tryOn = await getPollClient().tryons.retrieve(id);
      const message =
        tryOn.status === "failed"
          ? tryOn.message || friendlyMessage(new ClothsyError("", { code: "TRYON_FAILED" }))
          : undefined;
      return json({ status: tryOn.status, resultUrl: tryOn.resultUrl, message }, 200);
    } catch (error) {
      return errorResponse(error);
    }
  }

  return { POST, GET };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function errorResponse(error: unknown): Response {
  const message = friendlyMessage(error);
  if (error instanceof RateLimitError) {
    return json({ message }, 429, error.retryAfter !== undefined ? { "Retry-After": String(error.retryAfter) } : {});
  }
  if (error instanceof ValidationError) {
    if (error.code === "NOT_FOUND") return json({ message: "That try-on could not be found." }, 404);
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 400;
    // Consent/method problems are integration bugs, not the shopper's fault.
    return json({ message }, status === 403 || status === 405 ? 400 : status);
  }
  // Auth, credits, server and connection problems: log for the site owner, stay vague for shoppers.
  console.error("[clothsy-ai] try-on request failed:", error);
  return json({ message }, 503);
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

/** Basic CSRF protection: a browser `Origin` header must match the `Host` the request was sent to. */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // not a browser cross-site form/fetch
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")?.split(",")[0]]
    .filter((h): h is string => !!h)
    .map((h) => h.trim().toLowerCase());
  if (hosts.length === 0) {
    try {
      hosts.push(new URL(request.url).host.toLowerCase());
    } catch {
      return false;
    }
  }
  return hosts.includes(originHost);
}
