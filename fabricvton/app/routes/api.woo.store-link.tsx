import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import { finishStoreLink, StoreLinkError } from "../invoices/store-link.server";
import { parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { store, body } = await verifySignedRequest(request);
    if (store.connectionStatus !== "connected" || !store.siteUrl) return adminJson({ error: "Connect the plugin first." }, 409);
    const data = parseJsonBody(body);
    await finishStoreLink(String(data.code || ""), "woocommerce", store.siteUrl, store.shop);
    return adminJson({ connected: true });
  } catch (error) {
    if (error instanceof WooAuthError) return adminJson({ error: error.message }, error.status);
    if (error instanceof StoreLinkError) return adminJson({ error: error.message }, 400);
    console.error("[woo store link]", error);
    return adminJson({ error: "Could not link store." }, 500);
  }
};
export const loader = () => new Response("Method not allowed", { status: 405 });
