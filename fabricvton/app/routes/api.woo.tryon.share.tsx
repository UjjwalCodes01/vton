import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { clientIpFrom } from "../ratelimit.server";
import { handleShareRequest } from "../share/sharehandler.server";
import { logInternalError, newRequestId } from "../requestid.server";
import { corsHeaders, errorResponse } from "../tryon.server";
import { verifyShopperToken, WooAuthError } from "../woo/auth.server";

// POST /api/woo/tryon/share — same thing for WooCommerce stores, authenticated
// by the store-signed shopper token.

function tokenFrom(request: Request) {
  return request.headers.get("X-Clothsy-Token");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "*";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  return errorResponse("Method not allowed.", 405, origin, newRequestId());
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("Origin") || "*";
  const requestId = newRequestId();

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, origin, requestId);
  }

  try {
    const { store } = await verifyShopperToken(tokenFrom(request), request.headers.get("Origin"));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleShareRequest({ shop: store.shop, clientIp: clientIpFrom(request), body });

    if (!result.ok) return errorResponse(result.error, result.status, origin, requestId);

    return new Response(JSON.stringify({ url: result.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) },
    });
  } catch (error) {
    if (error instanceof WooAuthError) {
      return errorResponse(error.message, error.status, origin, requestId);
    }
    logInternalError(requestId, "woo share", error);
    return errorResponse("The link could not be created.", 500, origin, requestId);
  }
};
