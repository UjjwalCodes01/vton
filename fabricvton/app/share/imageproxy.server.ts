// Serving try-on results from our own domain.
//
// The provider returns a signed URL on its own bucket hostname. Handing that
// straight to the browser names our supplier in every shopper's network tab and
// in every shared link, and the URL dies after two hours. So results are
// addressed by a signed token of ours instead, and the bytes are streamed
// through the backend.

import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret() {
  const secret = process.env.SHARE_SIGNING_SECRET || process.env.SHOPIFY_API_SECRET || "";
  if (!secret) throw new Error("No signing secret configured for image links.");
  return secret;
}

function digest(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url").slice(0, 27);
}

/** `<base64url(shop|taskId)>.<mac>` — opaque, and useless on another shop. */
export function signImageToken(shop: string, taskId: string) {
  const payload = Buffer.from(`${shop}|${taskId}`).toString("base64url");
  return `${payload}.${digest(payload)}`;
}

export function verifyImageToken(token: string): { shop: string; taskId: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = digest(payload);

  // Same-length compare, so a mismatch cannot be timed character by character.
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  const [shop, taskId] = Buffer.from(payload, "base64url").toString("utf8").split("|");
  if (!shop || !taskId) return null;
  return { shop, taskId };
}

/**
 * Provider URLs expire, so they are re-fetched rather than stored — but a
 * result image is loaded several times in a row (panel, history, share sheet),
 * and each miss would cost a provider round trip.
 */
const urlCache = new Map<string, { url: string; until: number }>();
const CACHE_MS = 30 * 60 * 1000;

export function cachedResultUrl(taskId: string) {
  const hit = urlCache.get(taskId);
  if (hit && hit.until > Date.now()) return hit.url;
  urlCache.delete(taskId);
  return null;
}

export function rememberResultUrl(taskId: string, url: string) {
  // Bounded: this is a convenience cache, not a store.
  if (urlCache.size > 500) urlCache.clear();
  urlCache.set(taskId, { url, until: Date.now() + CACHE_MS });
}
