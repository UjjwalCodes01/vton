import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { getPlan, isBillingCycleDue } from "../billing.server";
import { clampText } from "../tryon-input.server";
import { originMatchesStore, parseJsonBody, verifySignedRequest } from "../woo/auth.server";
import { billingState, refreshStaleSubscriptions } from "../woo/billing.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/**
 * Everything the plugin's admin page shows, and the plugin's heartbeat.
 *
 * It also catches a staging copy: a clone of the site carries the same secret,
 * so its requests verify, but it reports a different URL. That is answered as
 * "url_mismatch" (and its shoppers are refused by the origin check) until the
 * merchant explicitly moves the connection via /api/woo/verify.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store: signedStore, body } = await verifySignedRequest(request);
    const data = parseJsonBody(body);
    const shop = signedStore.shop;

    // Catches up on any webhook we missed before reporting the plan.
    await refreshStaleSubscriptions(signedStore).catch((error) => console.warn("[Billing] refresh failed:", error));
    const store = await db.shopConfig.findUniqueOrThrow({ where: { shop } });

    await db.shopConfig.update({
      where: { shop },
      data: { lastHeartbeatAt: new Date(), pluginVersion: clampText(data.pluginVersion, 20) ?? store.pluginVersion },
    });

    const reportedUrl = typeof data.siteUrl === "string" ? data.siteUrl : null;
    const connectionStatus =
      store.connectionStatus === "connected" && reportedUrl && !originMatchesStore(new URL(reportedUrl).origin, store.siteUrl)
        ? "url_mismatch"
        : store.connectionStatus;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [totals, totalLeads, billing] = await Promise.all([
      db.analyticsDaily.aggregate({
        where: { shop, date: { gte: since } },
        _sum: { widgetOpens: true, tryOnsCompleted: true, emailsCaptured: true, tryOnsFailed: true },
      }),
      db.lead.count({ where: { shop } }),
      billingState(store),
    ]);

    const plan = getPlan(store.plan);
    // The cycle rolls lazily on the next try-on; show it as already rolled.
    const creditsUsed = isBillingCycleDue(store.billingCycleStart) ? 0 : store.creditsUsed;

    return wooJson({
      connectionStatus,
      siteUrl: store.siteUrl,
      isEnabled: store.isEnabled,
      isSuspended: store.isSuspended,
      plan: { name: plan.name, label: plan.label },
      monthlyCredits: store.monthlyCredits,
      creditsUsed,
      last30Days: {
        opens: totals._sum.widgetOpens ?? 0,
        tryOnsCompleted: totals._sum.tryOnsCompleted ?? 0,
        emailsCaptured: totals._sum.emailsCaptured ?? 0,
        failed: totals._sum.tryOnsFailed ?? 0,
      },
      totalLeads,
      billing,
    });
  } catch (error) {
    return wooError(error, "status");
  }
};

export const loader = () => methodNotAllowed();
