import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { getPlan } from "../billing.server";
import { BILLING_CURRENCY, billingConfigured, publicAppUrl } from "../woo/billing.server";
import { checkoutPage, messagePage } from "../woo/checkout-page.server";

const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The merchant's payment page for one checkout, reached from the plugin.
 * The token is an unguessable id for one BillingSubscription row; the page
 * shows only the plan and store name, and paying it can only benefit that store.
 */
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const token = params.token ?? "";
  const row = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await db.billingSubscription.findUnique({ where: { checkoutToken: token } })
    : null;
  if (!row || !billingConfigured()) {
    return messagePage("Checkout link not found", "This checkout link isn't valid. Please choose your plan again from WooCommerce → Clothsy AI.", undefined, 404);
  }

  if (row.status !== "created" || row.paymentVerifiedAt) {
    return messagePage("You're all set", "This plan is already set up. You can manage it from WooCommerce → Clothsy AI.", row.returnUrl);
  }
  if (Date.now() - row.createdAt.getTime() > CHECKOUT_TTL_MS) {
    return messagePage("Checkout link expired", "This checkout link has expired. Please choose your plan again from WooCommerce → Clothsy AI.", row.returnUrl);
  }

  const store = await db.shopConfig.findUnique({ where: { shop: row.shop } });
  if (!store || store.connectionStatus !== "connected") {
    return messagePage("Store not connected", "Reconnect your store in WooCommerce → Clothsy AI, then choose your plan again.", row.returnUrl);
  }

  const plan = getPlan(row.plan);
  const current = store.billingId && store.billingId !== row.id
    ? await db.billingSubscription.findUnique({ where: { id: store.billingId } })
    : null;
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency }).format(row.amount / 100);

  return checkoutPage({
    planLabel: plan.label,
    price,
    credits: plan.credits,
    storeName: store.storeName || new URL(store.siteUrl ?? row.returnUrl).hostname,
    startsAt: row.startAt,
    replacingLabel: current && current.status === "active" ? getPlan(current.plan).label : null,
    failed: new URL(request.url).searchParams.has("failed"),
    returnUrl: row.returnUrl,
    razorpay: {
      key: process.env.RAZORPAY_KEY_ID,
      subscription_id: row.id,
      name: "Clothsy AI",
      description: `${plan.label} plan · ${plan.credits} try-ons a month (${BILLING_CURRENCY})`,
      prefill: store.adminEmail ? { email: store.adminEmail } : {},
      notes: { store: store.shop },
      theme: { color: "#6226FC" },
      callback_url: `${publicAppUrl()}/billing/woo/callback/${token}`,
      redirect: true,
    },
  });
};
