// How a merchant proves, on a different domain, that they own a store.
//
// They don't type a password and we don't send an email: they open the portal
// from inside their Shopify admin, where Shopify has already authenticated
// them. That click mints a short-lived handoff token naming their shop, the
// portal swaps it for its own session cookie, and from then on the portal knows
// who it is talking to.
//
// The handoff token is deliberately single-purpose and short-lived: it travels
// in a URL, which means it can land in browser history and in a referrer.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Long enough to survive a redirect chain, short enough that a leaked URL is stale. */
const HANDOFF_TTL_MS = 2 * 60 * 1000;
/** How long the portal session it buys is good for. */
export const PORTAL_SESSION_HOURS = 12;

function secret() {
  // Shares the app secret's fate by default, but can be rotated on its own.
  return process.env.PORTAL_SIGNING_SECRET || process.env.SHOPIFY_API_SECRET || "";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function portalConfigured() {
  return secret().length >= 16 && Boolean(portalBaseUrl());
}

export function portalBaseUrl() {
  return (process.env.PORTAL_PUBLIC_BASE || "https://app.clothsy.fabricvton.com").replace(/\/+$/, "");
}

/** Mints the one-time token that carries a merchant from Shopify to the portal. */
export function mintHandoff(shop: string) {
  const payload = Buffer.from(
    JSON.stringify({ s: shop, x: Date.now() + HANDOFF_TTL_MS, k: "handoff" }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Reads a handoff token, returning the shop it names — or null for anything off. */
export function readHandoff(token: string): string | null {
  const dot = String(token || "").lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  if (!equal(token.slice(dot + 1), sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.k !== "handoff" || typeof data.s !== "string" || !data.x || data.x < Date.now()) return null;
    return data.s;
  } catch {
    return null;
  }
}

/**
 * Mints the portal's own session token.
 *
 * Separate from the handoff on purpose — a different `k` — so a session cookie
 * can never be replayed as a fresh handoff, or the other way round.
 */
export function mintPortalSession(shop: string) {
  const payload = Buffer.from(
    JSON.stringify({ s: shop, x: Date.now() + PORTAL_SESSION_HOURS * 3600_000, k: "session" }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readPortalSession(token: string | undefined | null): string | null {
  const dot = String(token || "").lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token!.slice(0, dot);
  if (!equal(token!.slice(dot + 1), sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.k !== "session" || typeof data.s !== "string" || !data.x || data.x < Date.now()) return null;
    return data.s;
  } catch {
    return null;
  }
}
