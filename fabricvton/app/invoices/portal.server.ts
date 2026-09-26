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

import { randomBytes, timingSafeEqual } from "node:crypto";
import { macFor, purposeKey, signFor } from "../signing.server";

/** Long enough to survive a redirect chain, short enough that a leaked URL is stale. */
const HANDOFF_TTL_MS = 2 * 60 * 1000;
/** How long the portal session it buys is good for. */
export const PORTAL_SESSION_HOURS = 12;

function sign(payload: string) {
  return signFor("portal", payload);
}

function verified(token: string) {
  const dot = String(token || "").lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const expected = macFor("portal", payload);
  if (!expected || !equal(token.slice(dot + 1), expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function portalConfigured() {
  return Boolean(purposeKey("portal")) && Boolean(portalBaseUrl());
}

export function portalBaseUrl() {
  return (process.env.PORTAL_PUBLIC_BASE || "https://app.clothsyai.fabricvton.com").replace(/\/+$/, "");
}

export interface Handoff {
  /** `account:<id>` after Google sign-in, or a shop domain from the Shopify admin. */
  subject: string;
  /** Spent on first exchange, so a link that leaks through history is already dead. */
  jti: string;
  /**
   * Hash of a cookie the portal set before sending the browser to Google. The
   * portal only accepts the handoff in the browser holding that cookie, which
   * is what stops someone signing a victim into the attacker's account by
   * sending them a finished sign-in link.
   */
  bind: string | null;
}

/** Mints the one-time token that carries a merchant into the portal. */
export function mintHandoff(subject: string, bind: string | null = null) {
  const payload = Buffer.from(
    JSON.stringify({
      s: subject,
      x: Date.now() + HANDOFF_TTL_MS,
      k: "handoff",
      j: randomBytes(12).toString("base64url"),
      ...(bind ? { b: bind } : {}),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Reads a handoff token — or null for anything off. Does not spend it. */
export function readHandoff(token: string): Handoff | null {
  const data = verified(token);
  if (!data || data.k !== "handoff" || typeof data.s !== "string" || !data.x || data.x < Date.now()) {
    return null;
  }
  if (typeof data.j !== "string" || data.j.length < 8) return null;
  return { subject: data.s, jti: data.j, bind: typeof data.b === "string" ? data.b : null };
}

/** A browser-binding value the portal may pass through sign-in: a base64url SHA-256. */
export function validBinding(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

/**
 * Mints the portal's own session token.
 *
 * Separate from the handoff on purpose — a different `k` — so a session cookie
 * can never be replayed as a fresh handoff, or the other way round.
 *
 * A session names an account. Sessions minted before accounts existed named a
 * shop instead, and readPortalSession still understands those so nobody is
 * logged out by this change; they disappear on their own within 12 hours.
 */
export function mintPortalSession(accountId: string) {
  const payload = Buffer.from(
    JSON.stringify({ a: accountId, i: Date.now(), x: Date.now() + PORTAL_SESSION_HOURS * 3600_000, k: "session" }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export interface PortalSubject {
  accountId?: string;
  /** When the session was minted; 0 for tokens from before this was recorded. */
  issuedAt?: number;
  /** Only set for a session issued before accounts existed. */
  shop?: string;
}

export function readPortalSession(token: string | undefined | null): PortalSubject | null {
  const data = verified(String(token || ""));
  if (!data || data.k !== "session" || !data.x || data.x < Date.now()) return null;
  if (typeof data.a === "string") return { accountId: data.a, issuedAt: typeof data.i === "number" ? data.i : 0 };
  if (typeof data.s === "string") return { shop: data.s };
  return null;
}

/** Where Google sends the browser back to. */
export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
