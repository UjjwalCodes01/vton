import "server-only";
import { createHash } from "node:crypto";

/** The browser-binding value sent through sign-in: base64url SHA-256 of the cookie. */
export function bindingFor(cookieValue: string) {
  return createHash("sha256").update(cookieValue).digest("base64url");
}

/**
 * What a handoff token claims, read without verifying it.
 *
 * Only for choosing what to show — the backend verifies the signature when the
 * token is exchanged, and every security decision uses what it returns.
 */
export function peekHandoff(token: string): { subject: string | null; bound: boolean } {
  try {
    const payload = token.slice(0, token.lastIndexOf("."));
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { subject: typeof data.s === "string" ? data.s : null, bound: typeof data.b === "string" };
  } catch {
    return { subject: null, bound: false };
  }
}
