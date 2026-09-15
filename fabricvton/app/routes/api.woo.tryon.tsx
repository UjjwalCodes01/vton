import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { clientIpFrom } from "../ratelimit.server";
import { declaredBodyTooLarge, MAX_IMAGE_BYTES } from "../tryon-input.server";
import { logInternalError, newRequestId } from "../requestid.server";
import {
  corsHeaders,
  errorResponse,
  handleTryOnLoader,
  parseErrorResponse,
  parseTryOnBody,
  runTryOn,
} from "../tryon.server";
import { verifyShopperToken, WooAuthError } from "../woo/auth.server";

// Shopper-facing try-on endpoint for WooCommerce stores. Called directly from
// the shopper's browser on the store's own domain, so it is cross-origin and
// every response carries CORS headers. Identity comes only from the
// store-signed token in X-Clothsy-Token (see app/woo/auth.server.ts).

function tokenFrom(request: Request) {
  return request.headers.get("X-Clothsy-Token");
}

function shopperError(error: unknown, origin: string, requestId: string) {
  if (error instanceof WooAuthError) {
    return errorResponse(error.message, error.status, origin, requestId);
  }
  logInternalError(requestId, "woo tryon", error);
  return errorResponse("Something went wrong. Please try again.", 500, origin, requestId);
}

// GET: status polls and the "widget opened" ping. OPTIONS lands here too:
// React Router sends every non-mutating method to the loader, so the CORS
// preflight must be answered in the loader, not the action.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "*";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  const requestId = newRequestId();
  try {
    const { store } = await verifyShopperToken(tokenFrom(request), request.headers.get("Origin"));
    return await handleTryOnLoader(request, store.shop);
  } catch (error) {
    return shopperError(error, origin, requestId);
  }
};

// POST: start a try-on. Product details come from the signed token, never
// from the request body, so a shopper can't point the try-on at an arbitrary
// image or at another store's product.
export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("Origin") || "*";
  const requestId = newRequestId();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, origin, requestId);
  }
  if (declaredBodyTooLarge(request)) {
    return errorResponse(
      `Request too large. Photos must be under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`,
      413,
      origin,
      requestId,
    );
  }

  try {
    const { store, claims } = await verifyShopperToken(tokenFrom(request), request.headers.get("Origin"));

    let body;
    try {
      body = await parseTryOnBody(request);
    } catch (parseError) {
      return parseErrorResponse(parseError, origin, requestId);
    }

    console.log(`[TryOn API][${requestId}] WooCommerce generation requested for ${store.shop}`);
    return await runTryOn({
      shop: store.shop,
      origin,
      requestId,
      clientIp: clientIpFrom(request),
      sessionId: body.sessionId,
      email: body.email,
      personImage: body.personImage,
      product: { id: claims.p, title: claims.t, imageUrl: claims.i, category: claims.c },
    });
  } catch (error) {
    return shopperError(error, origin, requestId);
  }
};
