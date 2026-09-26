// Serving try-on results from our own domain.
//
// The provider returns a signed URL on its own bucket hostname. Handing that
// straight to the browser names our supplier in every shopper's network tab and
// in every shared link, and the URL dies after two hours. So results are
// addressed by a signed token of ours instead, and the bytes are streamed
// through the backend.

import { timingSafeEqual } from "node:crypto";
import { macFor, signFor } from "../signing.server";

/** Long enough for a session of browsing; short enough that a copied link dies. */
const IMAGE_TOKEN_TTL_MS = 24 * 3600 * 1000;

/**
 * `<base64url(eventId.expiry)>.<mac>`.
 *
 * Names our own event id, never the generator's task id: the payload is
 * readable by anyone holding the link, so it must not carry anything that
 * identifies where the image was made. The event id is a unique key, so the
 * token cannot be pointed at another store's generation either.
 */
export function signImageToken(eventId: string) {
  const expiry = Math.floor((Date.now() + IMAGE_TOKEN_TTL_MS) / 1000);
  const payload = Buffer.from(`${eventId}.${expiry}`).toString("base64url");
  return `${payload}.${signFor("image", payload).slice(0, 27)}`;
}

export function verifyImageToken(token: string): { eventId: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = macFor("image", payload)?.slice(0, 27);
  if (!expected) return null;

  // Same-length compare, so a mismatch cannot be timed character by character.
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  const [eventId, expiry] = Buffer.from(payload, "base64url").toString("utf8").split(".");
  if (!eventId || !expiry || Number(expiry) * 1000 < Date.now()) return null;
  return { eventId };
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
