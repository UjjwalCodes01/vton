import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { BILLING_SUSPEND_PREFIX, getPlan } from "../billing.server";

// app_subscriptions/update — Shopify fires this on every subscription status
// change. Without it a shop whose payment method fails keeps consuming try-ons
// indefinitely, because nothing else re-checks billing until the merchant
// happens to open the billing page.

type SubscriptionPayload = {
  app_subscription?: {
    admin_graphql_api_id?: string;
    name?: string;
    status?: string;
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "APP_SUBSCRIPTIONS_UPDATE") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  const subscription = (payload as SubscriptionPayload).app_subscription ?? {};
  const status = String(subscription.status ?? "").toUpperCase();
  const name = String(subscription.name ?? "");

  const config = await db.shopConfig.findUnique({ where: { shop } });
  if (!config) {
    console.log(`[Billing] ${topic} for unknown shop ${shop} — ignoring.`);
    return new Response("ok", { status: 200 });
  }

  if (status === "ACTIVE" || status === "ACCEPTED") {
    // Payment is good again. Only lift a suspension we applied ourselves —
    // an admin's manual suspension must survive.
    const wasBillingSuspended =
      config.isSuspended &&
      (config.suspendReason ?? "").startsWith(BILLING_SUSPEND_PREFIX);

    if (wasBillingSuspended) {
      await db.shopConfig.update({
        where: { shop },
        data: { isSuspended: false, suspendReason: null },
      });
      console.log(`[Billing] Restored ${shop} after subscription became ${status}.`);
    }

    return new Response("ok", { status: 200 });
  }

  if (status === "FROZEN") {
    // Shopify freezes a subscription when it cannot collect. Stop serving
    // try-ons immediately — every one costs us a provider credit.
    await db.shopConfig.update({
      where: { shop },
      data: {
        isSuspended: true,
        suspendReason: `${BILLING_SUSPEND_PREFIX}subscription frozen by Shopify (payment failed)`,
      },
    });
    console.log(`[Billing] Suspended ${shop} — subscription FROZEN.`);
    return new Response("ok", { status: 200 });
  }

  if (status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED") {
    // Not a payment failure — the merchant simply stopped paying for a paid
    // tier. Drop them to the entry plan rather than suspending them.
    const entryPlan = getPlan("free");
    await db.shopConfig.update({
      where: { shop },
      data: {
        plan: entryPlan.name,
        billingId: null,
        monthlyCredits: entryPlan.credits,
      },
    });
    console.log(`[Billing] ${shop} moved to ${entryPlan.label} — subscription ${status}.`);
    return new Response("ok", { status: 200 });
  }

  console.log(`[Billing] ${shop} subscription "${name}" reported status ${status}.`);
  return new Response("ok", { status: 200 });
};
