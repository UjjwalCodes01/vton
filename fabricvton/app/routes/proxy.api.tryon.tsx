import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleTryOnAction, handleTryOnLoader } from "../tryon.server";
import { logInternalError, newRequestId } from "../requestid.server";

/**
 * The shop this request provably came from.
 *
 * Shopify's app proxy signs the query string, and `shop` is part of what the
 * signature covers — so once authenticate.public.appProxy has accepted the
 * request, the query-string shop is trustworthy. The session, when the app is
 * installed, is preferred because it is the authenticated installation itself.
 *
 * What we must never do is fall back to a `shop` field in the request body, as
 * this route used to allow: that value is attacker-chosen, and with it a caller
 * could spend any merchant's try-on allowance and bill it against their approved
 * usage cap.
 */
function verifiedShopFrom(request: Request, context: unknown): string {
  // Read the session defensively rather than asserting the SDK's return shape:
  // appProxy resolves with no session when the app is not installed for the shop,
  // and the exact type varies across SDK versions.
  const session = (context as { session?: { shop?: unknown } | null } | null)?.session;
  if (session && typeof session.shop === "string" && session.shop) {
    return session.shop;
  }

  return new URL(request.url).searchParams.get("shop") || "";
}

/**
 * Public-facing failure. Carries a correlation id and nothing else — the real
 * reason goes to the log under the same id.
 */
function proxyJsonError(requestId: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: message, requestId }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const context = await authenticate.public.appProxy(request);
    return await handleTryOnLoader(request, verifiedShopFrom(request, context));
  } catch (error) {
    if (error instanceof Response) {
      logInternalError(requestId, `app proxy loader (${error.status})`, error.statusText);
      return proxyJsonError(requestId, "This request could not be verified.", error.status);
    }
    logInternalError(requestId, "app proxy loader", error);
    return proxyJsonError(requestId, "Something went wrong. Please try again.", 500);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const context = await authenticate.public.appProxy(request);
    return await handleTryOnAction(request, verifiedShopFrom(request, context));
  } catch (error) {
    if (error instanceof Response) {
      logInternalError(requestId, `app proxy action (${error.status})`, error.statusText);
      return proxyJsonError(requestId, "This request could not be verified.", error.status);
    }
    logInternalError(requestId, "app proxy action", error);
    return proxyJsonError(requestId, "Something went wrong. Please try again.", 500);
  }
};
