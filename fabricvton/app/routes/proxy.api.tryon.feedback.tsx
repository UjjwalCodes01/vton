import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { parseRating, recordTryOnRating } from "../feedback.server";
import { logInternalError, newRequestId } from "../requestid.server";
import { readJsonLimited } from "../bodylimit.server";

// POST /apps/<proxy>/api/tryon/feedback — the shopper's rating of a try-on.
//
// Identity comes from Shopify's signed app proxy, exactly as the try-on route
// itself does: the shop in the body would be attacker-chosen, so it is ignored.

function jsonError(requestId: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: message, requestId }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function verifiedShopFrom(request: Request, context: unknown): string {
  const session = (context as { session?: { shop?: unknown } | null } | null)?.session;
  if (session && typeof session.shop === "string" && session.shop) return session.shop;
  return new URL(request.url).searchParams.get("shop") || "";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const context = await authenticate.public.appProxy(request);
    const shop = verifiedShopFrom(request, context);
    if (!shop) return jsonError(requestId, "This request could not be verified.", 401);

    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const rating = parseRating(body.rating);
    const generationId = typeof body.generationId === "string" ? body.generationId.slice(0, 128) : "";
    if (!rating || !generationId) {
      return jsonError(requestId, "A rating and a try-on are both required.", 400);
    }

    const result = await recordTryOnRating({ shop, generationId, rating });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Response) {
      logInternalError(requestId, `feedback proxy (${error.status})`, error.statusText);
      return jsonError(requestId, "This request could not be verified.", error.status);
    }
    logInternalError(requestId, "feedback proxy", error);
    return jsonError(requestId, "Something went wrong.", 500);
  }
};
