import { logInternalError, newRequestId } from "../requestid.server";
import { UnsafeUrlError } from "./net.server";
import { WooAuthError } from "./auth.server";

// Responses for the plugin-facing (server-to-server) WooCommerce endpoints.
// These are called by WordPress, not browsers, so they carry no CORS headers.

export function wooJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Maps a thrown error to a response. Auth and URL errors are expected and carry
 * a message meant for the merchant; anything else is logged under a request id
 * and answered generically, so internals never reach the plugin's admin screen.
 */
export function wooError(error: unknown, stage: string) {
  if (error instanceof WooAuthError) {
    return wooJson({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof UnsafeUrlError) {
    return wooJson({ error: error.message, code: "bad_url" }, 400);
  }
  const requestId = newRequestId();
  logInternalError(requestId, `woo ${stage}`, error);
  return wooJson({ error: "Something went wrong. Please try again.", code: "internal", requestId }, 500);
}

export function methodNotAllowed() {
  return wooJson({ error: "Method not allowed", code: "method" }, 405);
}
