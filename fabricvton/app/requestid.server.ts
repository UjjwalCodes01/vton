// Request correlation IDs for the public (storefront) API surface.
//
// Nothing a shopper sees should carry an upstream error string: provider
// messages leak endpoint names, task ids, plan state and occasionally
// credentials in a query string. Instead every public response carries a short
// requestId, the detail is written to the server log under that same id, and
// support correlates the two. See app/tryon.server.ts for the call sites.

import { randomBytes } from "node:crypto";

export function newRequestId(): string {
  return `req_${randomBytes(6).toString("hex")}`;
}

/**
 * Logs the real failure against a request id and returns nothing.
 *
 * Deliberately separate from the response builders so it is impossible to
 * "accidentally" return the detail: the caller never holds it in a value that
 * gets serialized.
 */
export function logInternalError(
  requestId: string,
  stage: string,
  error: unknown
) {
  const detail = error instanceof Error ? error.message : String(error ?? "unknown");
  console.error(`[TryOn API][${requestId}] ${stage} failed: ${detail}`);
  if (error instanceof Error && error.stack) {
    console.error(`[TryOn API][${requestId}] ${error.stack}`);
  }
}
