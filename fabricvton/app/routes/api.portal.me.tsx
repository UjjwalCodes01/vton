import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { allowanceFor } from "../credits.server";
import { getPlan, isBillingCycleDue } from "../billing.server";
import { planLabelFor } from "../customplan.server";
import { readPortalSession } from "../invoices/portal.server";
import { invoicesForMerchant, razorpayConfigured, razorpayKeyId } from "../invoices/invoice.server";

/**
 * Everything the portal shows: the store, what it may spend, and its invoices.
 *
 * POST rather than GET so the session token stays in the body and out of logs
 * and referrers.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await request.json().catch(() => ({}))) as { session?: string };
  const shop = readPortalSession(body.session);
  if (!shop) return adminJson({ error: "Session expired." }, 401);

  const store = await db.shopConfig.findUnique({ where: { shop } });
  if (!store) return adminJson({ error: "That store is no longer connected." }, 404);

  // The allowance rolls lazily on the next try-on, so a merchant looking at the
  // portal the morning a cycle ends would otherwise see yesterday's usage.
  const rolled = isBillingCycleDue(store.billingCycleStart);
  const used = rolled ? 0 : store.creditsUsed;
  const topUp = rolled ? 0 : store.cycleTopUpCredits;

  return adminJson({
    store: {
      shop: store.shop,
      name: store.storeName || store.shop,
      platform: store.platform,
      plan: planLabelFor(store),
      planCredits: getPlan(store.plan).credits,
      allowance: rolled ? store.monthlyCredits : allowanceFor(store),
      topUpCredits: topUp,
      used,
      cycleStart: rolled ? new Date() : store.billingCycleStart,
      isSuspended: store.isSuspended,
    },
    invoices: await invoicesForMerchant(shop),
    payments: { enabled: razorpayConfigured(), keyId: razorpayKeyId() },
  });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
