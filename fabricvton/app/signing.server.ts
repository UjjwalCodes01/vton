// One key per kind of token.
//
// Every token this app mints is `<base64url payload>.<HMAC>`, and they used to
// share one raw secret. That made them interchangeable in principle: nothing
// but the payload's JSON shape stopped a token minted for one purpose being
// accepted as another, and Shopify's own session JWTs (signed with the same app
// secret, same MAC construction) passed the signature check too. Deriving a key
// per purpose makes a token only ever verify where it was meant to.
//
// The root still comes from the existing environment variables, so nothing
// needs configuring — but an empty or short root now fails closed instead of
// signing with "".

import { createHmac } from "node:crypto";

export type TokenPurpose = "portal" | "oauth" | "image" | "garment";

const ROOTS: Record<TokenPurpose, string> = {
  portal: "PORTAL_SIGNING_SECRET",
  oauth: "PORTAL_SIGNING_SECRET",
  image: "SHARE_SIGNING_SECRET",
  garment: "SHARE_SIGNING_SECRET",
};

const MIN_ROOT_LENGTH = 16;
const cache = new Map<TokenPurpose, Buffer>();

/** The key for one purpose, or null when no usable root secret is configured. */
export function purposeKey(purpose: TokenPurpose): Buffer | null {
  const hit = cache.get(purpose);
  if (hit) return hit;

  const root = process.env[ROOTS[purpose]] || process.env.SHOPIFY_API_SECRET || "";
  if (root.length < MIN_ROOT_LENGTH) return null;

  const key = createHmac("sha256", root).update(`clothsy/${purpose}/v2`).digest();
  cache.set(purpose, key);
  return key;
}

/** Signs for minting. Throws, rather than signing with nothing, when unconfigured. */
export function signFor(purpose: TokenPurpose, value: string) {
  const key = purposeKey(purpose);
  if (!key) throw new Error(`No signing secret configured for ${purpose} tokens.`);
  return createHmac("sha256", key).update(value).digest("base64url");
}

/** Signs for checking. Null when unconfigured, so every read simply fails. */
export function macFor(purpose: TokenPurpose, value: string) {
  const key = purposeKey(purpose);
  return key ? createHmac("sha256", key).update(value).digest("base64url") : null;
}
