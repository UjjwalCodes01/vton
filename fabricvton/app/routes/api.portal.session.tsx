import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import { mintPortalSession, readHandoff } from "../invoices/portal.server";

/**
 * Swaps a one-time handoff token for a portal session.
 *
 * Called server-to-server by the portal, never by a browser, so the handoff
 * token never has to survive in client JavaScript.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const shop = readHandoff(String(body.token || ""));
  if (!shop) return adminJson({ error: "That sign-in link has expired. Open the portal from your Shopify admin again." }, 401);
  return adminJson({ shop, session: mintPortalSession(shop) });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
