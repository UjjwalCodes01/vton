import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { originMatchesStore, parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { cancelPlan } from "../woo/billing.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/**
 * The merchant disconnected (or deleted) the plugin. The secret is destroyed,
 * so tokens and signatures made with it stop working immediately. The store's
 * leads and analytics are kept for RETENTION.wooDisconnectedStoreDays so a
 * reconnect from the same site gets them back, then purged.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);

    // A staging copy carries the live store's credentials. Deleting the plugin
    // there must not take the live store offline, so a disconnect is only
    // honoured from the URL the store is connected at.
    const reportedUrl = parseJsonBody(body).siteUrl;
    if (typeof reportedUrl === "string" && store.siteUrl) {
      let origin: string | null = null;
      try {
        origin = new URL(reportedUrl).origin;
      } catch {
        // Treated as a mismatch below.
      }
      if (!originMatchesStore(origin, store.siteUrl)) {
        throw new WooAuthError(409, "This site is a copy of the connected store, so it can't disconnect it.", "url_mismatch");
      }
    }

    // A merchant who removes the plugin must never be charged again. The plan
    // runs to the end of the period they paid for (so a quick reconnect keeps
    // it). A failure here is logged but doesn't block disconnecting, which the
    // plugin does locally regardless.
    await cancelPlan(store, { disconnecting: true }).catch((error) => console.error(`[Billing] Cancel on disconnect failed for ${store.shop}:`, error));

    await db.shopConfig.update({
      where: { shop: store.shop },
      data: { connectionStatus: "disconnected", siteSecretEnc: null, disconnectedAt: new Date() },
    });
    console.log(`[Woo] ${store.shop} disconnected`);
    return wooJson({ disconnected: true });
  } catch (error) {
    return wooError(error, "disconnect");
  }
};

export const loader = () => methodNotAllowed();
