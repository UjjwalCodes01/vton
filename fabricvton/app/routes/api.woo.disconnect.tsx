import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { verifySignedRequest } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/**
 * The merchant disconnected the plugin. The secret is destroyed, so tokens and
 * signatures made with it stop working immediately; the store's leads and
 * analytics are kept, like an uninstalled Shopify shop awaiting redaction.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store } = await verifySignedRequest(request);
    await db.shopConfig.update({
      where: { shop: store.shop },
      data: { connectionStatus: "disconnected", siteSecretEnc: null },
    });
    console.log(`[Woo] ${store.shop} disconnected`);
    return wooJson({ disconnected: true });
  } catch (error) {
    return wooError(error, "disconnect");
  }
};

export const loader = () => methodNotAllowed();
