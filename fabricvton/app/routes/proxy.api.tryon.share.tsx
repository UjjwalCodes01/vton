import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleShareRequest } from "../share/sharehandler.server";
import { logInternalError, newRequestId } from "../requestid.server";

// POST /apps/<proxy>/api/tryon/share — turns a finished try-on into a link on
// our own domain. Identity comes from Shopify's signed app proxy.

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const context = await authenticate.public.appProxy(request);
    const session = (context as { session?: { shop?: unknown } | null } | null)?.session;
    const shop =
      session && typeof session.shop === "string" && session.shop
        ? session.shop
        : new URL(request.url).searchParams.get("shop") || "";
    if (!shop) return json({ error: "This request could not be verified.", requestId }, 401);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleShareRequest(shop, body);
    return result.ok
      ? json({ url: result.url }, 200)
      : json({ error: result.error, requestId }, result.status);
  } catch (error) {
    if (error instanceof Response) {
      logInternalError(requestId, `share proxy (${error.status})`, error.statusText);
      return json({ error: "This request could not be verified.", requestId }, error.status);
    }
    logInternalError(requestId, "share proxy", error);
    return json({ error: "The link could not be created.", requestId }, 500);
  }
};
