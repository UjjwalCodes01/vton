import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import db from "../db.server";
import { allowanceFor } from "../credits.server";
import { getPlan, isBillingCycleDue } from "../billing.server";
import { planLabelFor } from "../customplan.server";
import { subjectFromSession } from "../invoices/subject.server";
import { invoicesForMerchant, razorpayConfigured, razorpayKeyId } from "../invoices/invoice.server";
import { readJsonLimited } from "../bodylimit.server";

/**
 * Everything the platform shows a signed-in account: who they are, what they
 * can spend, which stores they have connected, and their invoices.
 *
 * POST rather than GET so the session token stays in the body and out of logs
 * and referrers.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await readJsonLimited(request)) as { session?: string };
  const subject = await subjectFromSession(body.session);
  if (!subject) return adminJson({ error: "Session expired." }, 401);

  const { account, stores } = subject;

  const shaped = stores.map((store) => {
    // The allowance rolls lazily on the next try-on, so an account looking at
    // this the morning a cycle ends would otherwise see yesterday's usage.
    const rolled = isBillingCycleDue(store.billingCycleStart);
    return {
      shop: store.shop,
      name: store.storeName || store.shop,
      platform: store.platform,
      plan: planLabelFor(store),
      planCredits: getPlan(store.plan).credits,
      allowance: rolled ? store.monthlyCredits : allowanceFor(store),
      topUpCredits: rolled ? 0 : store.cycleTopUpCredits,
      used: rolled ? 0 : store.creditsUsed,
      cycleStart: rolled ? new Date() : store.billingCycleStart,
      isSuspended: store.isSuspended,
      isEnabled: store.isEnabled,
    };
  });

  // Invoices across every store they manage, newest first.
  const invoices = (await Promise.all(stores.map((store) => invoicesForMerchant(store.shop))))
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [tryOnsThisMonth] = await Promise.all([
    stores.length
      ? db.tryOnEvent.count({
          where: {
            shop: { in: stores.map((s) => s.shop) },
            status: "success",
            createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
          },
        })
      : 0,
  ]);

  return adminJson({
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      credits: account.credits,
      // A placeholder address means this account was made for a store and has
      // never been claimed by a real sign-in.
      isPlaceholder: account.email.endsWith("@stores.clothsyai.invalid"),
    },
    stores: shaped,
    invoices,
    stats: { tryOnsThisMonth },
    payments: { enabled: razorpayConfigured(), keyId: razorpayKeyId() },
  });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
