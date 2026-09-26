import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parseRating, recordTryOnRating } from "../feedback.server";
import { logInternalError, newRequestId } from "../requestid.server";
import { corsHeaders, errorResponse } from "../tryon.server";
import { verifyShopperToken, WooAuthError } from "../woo/auth.server";
import { readJsonLimited } from "../bodylimit.server";

// POST /api/woo/tryon/feedback — the shopper's rating of a finished try-on.
//
// Called from the store's own domain, so it is cross-origin and every response
// carries CORS headers. Identity comes only from the store-signed token in
// X-Clothsy-Token, exactly as the try-on endpoint does.

function tokenFrom(request: Request) {
  return request.headers.get("X-Clothsy-Token");
}

// React Router sends every non-mutating method to the loader, so the CORS
// preflight must be answered here rather than in the action.
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

    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const rating = parseRating(body.rating);
    const generationId = typeof body.generationId === "string" ? body.generationId.slice(0, 128) : "";
    if (!rating || !generationId) {
      return errorResponse("A rating and a try-on are both required.", 400, origin, requestId);
    }

    const result = await recordTryOnRating({ shop: store.shop, generationId, rating });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) },
    });
  } catch (error) {
    if (error instanceof WooAuthError) {
      return errorResponse(error.message, error.status, origin, requestId);
    }
    logInternalError(requestId, "woo tryon feedback", error);
    return errorResponse("Something went wrong.", 500, origin, requestId);
  }
};
