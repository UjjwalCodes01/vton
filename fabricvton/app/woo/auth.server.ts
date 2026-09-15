import { Prisma, type ShopConfig } from "@prisma/client";
import db from "../db.server";
import { decryptSecret, hmacBase64Url, hmacHex, safeEqual, sha256Hex } from "./crypto.server";
import { ALLOW_INSECURE_URLS } from "./net.server";

// Two kinds of WooCommerce request reach the backend, and each proves itself
// with the store's per-store secret:
//
//   * Plugin → backend (connect, status, settings): the WordPress server signs
//     the whole request. The secret never leaves the merchant's server.
//   * Shopper browser → backend (try-on, polling): the browser can't hold the
//     secret, so the plugin mints a short-lived token for one product, signed
//     with the secret, and the browser presents it. This is the WooCommerce
//     counterpart of Shopify's signed app-proxy requests.

export const WOO_PLATFORM = "woocommerce";
export const WOO_STORE_ID = /^woo_[A-Za-z0-9_-]{8,64}$/;

/** Allowed difference between the plugin's clock and ours. */
const CLOCK_SKEW_SECONDS = 300;
/** Signed plugin requests carry small JSON bodies; anything bigger is refused. */
const MAX_SIGNED_BODY_BYTES = 64 * 1024;

export const GARMENT_CATEGORIES = new Set(["upper_body", "lower_body", "full_body", "outerwear", "shoes"]);

export class WooAuthError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export function loadWooStore(storeId: string) {
  if (!WOO_STORE_ID.test(storeId)) return Promise.resolve(null);
  return db.shopConfig.findFirst({ where: { shop: storeId, platform: WOO_PLATFORM } });
}

export function storeSecret(store: ShopConfig): string {
  if (!store.siteSecretEnc) throw new WooAuthError(401, "Store is not connected", "unknown_store");
  return decryptSecret(store.siteSecretEnc);
}

/**
 * The exact string a plugin request is signed over. Must stay byte-for-byte
 * identical to Clothsy_AI_Api_Client::canonical() in the plugin.
 */
export function canonicalRequest(method: string, path: string, timestamp: string, nonce: string, body: string) {
  return [method.toUpperCase(), path, timestamp, nonce, sha256Hex(body)].join("\n");
}

/**
 * Verifies a signed plugin request and returns its store and raw body.
 *
 * Order matters: the signature is checked before the nonce is stored, so
 * unauthenticated junk can't fill the nonce table.
 */
export async function verifySignedRequest(request: Request): Promise<{ store: ShopConfig; body: string }> {
  const storeId = request.headers.get("X-Clothsy-Store") ?? "";
  const timestamp = request.headers.get("X-Clothsy-Timestamp") ?? "";
  const nonce = request.headers.get("X-Clothsy-Nonce") ?? "";
  const signature = request.headers.get("X-Clothsy-Signature") ?? "";

  if (
    !WOO_STORE_ID.test(storeId) ||
    !/^\d{9,11}$/.test(timestamp) ||
    !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    throw new WooAuthError(401, "Missing or malformed signature", "bad_signature");
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > CLOCK_SKEW_SECONDS) {
    throw new WooAuthError(401, "Request timestamp is outside the allowed window. Check the server clock.", "stale_request");
  }

  const body = await request.text();
  if (body.length > MAX_SIGNED_BODY_BYTES) {
    throw new WooAuthError(413, "Request body too large", "too_large");
  }

  const store = await loadWooStore(storeId);
  if (!store) throw new WooAuthError(401, "Unknown store", "unknown_store");

  const path = new URL(request.url).pathname;
  const expected = hmacHex(storeSecret(store), canonicalRequest(request.method, path, timestamp, nonce, body));
  if (!safeEqual(expected, signature)) {
    throw new WooAuthError(401, "Invalid signature", "bad_signature");
  }

  try {
    await db.wooRequestNonce.create({ data: { id: `${storeId}:${nonce}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new WooAuthError(401, "This request was already used", "replay");
    }
    throw error;
  }

  return { store, body };
}

/** Parses a signed request's body as a JSON object. */
export function parseJsonBody(body: string): Record<string, unknown> {
  if (!body) return {};
  try {
    const value = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    throw new WooAuthError(400, "Body must be JSON", "bad_json");
  }
}

// ─── Shopper tokens ────────────────────────────────────────────────────────

export interface ShopperClaims {
  /** Store id */
  s: string;
  /** WooCommerce product id */
  p: string;
  /** Selected variation id, when the product is variable */
  vid: string | null;
  /** Product title */
  t: string | null;
  /** Garment image URL, resolved by the store from its own product data */
  i: string;
  /** Garment category chosen by the merchant, or null to infer from the title */
  c: string | null;
  /** Expiry, unix seconds */
  e: number;
}

function hostVariants(host: string) {
  return host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`];
}

/**
 * Whether a browser Origin belongs to the store. www and non-www count as the
 * same site, since many stores serve both.
 */
export function originMatchesStore(origin: string | null, siteUrl: string | null): boolean {
  if (!origin || !siteUrl) return false;
  try {
    const request = new URL(origin);
    const store = new URL(siteUrl);
    if (request.protocol !== store.protocol || request.port !== store.port) return false;
    return hostVariants(store.hostname).includes(request.hostname);
  } catch {
    return false;
  }
}

function parseClaims(payload: string): ShopperClaims {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new WooAuthError(401, "Malformed token", "bad_token");
  }
  const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);
  const claims: ShopperClaims = {
    s: str(raw.s, 80) ?? "",
    p: str(raw.p, 40) ?? "",
    vid: str(raw.vid, 40),
    t: str(raw.t, 255),
    i: str(raw.i, 2048) ?? "",
    c: str(raw.c, 40),
    e: typeof raw.e === "number" ? raw.e : 0,
  };
  if (!claims.s || !claims.p || !claims.i || !claims.e) {
    throw new WooAuthError(401, "Malformed token", "bad_token");
  }
  if (claims.c && !GARMENT_CATEGORIES.has(claims.c)) claims.c = null;
  try {
    const image = new URL(claims.i);
    if (image.protocol !== "https:" && !(ALLOW_INSECURE_URLS && image.protocol === "http:")) throw new Error();
  } catch {
    throw new WooAuthError(422, "This product's image can't be used for try-on.", "bad_image");
  }
  return claims;
}

/**
 * Verifies a shopper token and the browser Origin it arrived with.
 *
 * The Origin check matters because a token alone is a bearer credential: it's
 * what stops someone copying one out of a product page and spending the
 * store's try-ons from their own site. (A non-browser client can forge Origin;
 * the short expiry and the per-session and per-store rate limits cover that.)
 */
export async function verifyShopperToken(
  token: string | null,
  origin: string | null,
): Promise<{ store: ShopConfig; claims: ShopperClaims }> {
  if (!token || token.length > 4096 || !token.includes(".")) {
    throw new WooAuthError(401, "Missing try-on token", "no_token");
  }
  const [payload, signature] = token.split(".", 2);
  const claims = parseClaims(payload);

  if (claims.e < Date.now() / 1000) {
    throw new WooAuthError(401, "This try-on session expired. Please reload the page.", "expired");
  }

  const store = await loadWooStore(claims.s);
  if (!store) throw new WooAuthError(401, "Unknown store", "unknown_store");
  if (!safeEqual(hmacBase64Url(storeSecret(store), payload), signature ?? "")) {
    throw new WooAuthError(401, "Invalid try-on token", "bad_token");
  }
  if (store.connectionStatus !== "connected") {
    throw new WooAuthError(403, "Virtual try-on isn't set up for this store yet.", "not_connected");
  }
  if (!originMatchesStore(origin, store.siteUrl)) {
    throw new WooAuthError(403, "Virtual try-on isn't available on this website.", "bad_origin");
  }
  return { store, claims };
}
