// Custom plans.
//
// A store on a negotiated deal keeps whatever plan it is subscribed to — that
// is what Shopify or Razorpay is charging for — but its monthly allowance comes
// from `customCredits` instead of the plan's own number, and its billing screen
// says so.
//
// Money is deliberately not modelled here. A custom deal is paid for outside
// the self-serve picker (a Shopify private plan, an invoice, a bank transfer),
// so `customNote` records the arrangement for whoever has to answer for it
// later, and nothing in this file charges anybody.

import type { ShopConfig } from "@prisma/client";
import db from "./db.server";
import { getPlan } from "./billing.server";

export type CustomPlanFields = Pick<
  ShopConfig,
  "customPlanLabel" | "customCredits" | "customNote" | "customSetAt" | "customSetBy"
>;

export function hasCustomPlan(config: Pick<ShopConfig, "customCredits"> | null | undefined) {
  return Boolean(config && config.customCredits != null && config.customCredits >= 0);
}

/**
 * The allowance a store should have this cycle.
 *
 * Every plan sync calls this rather than reading `plan.credits` directly, so a
 * custom allowance survives an upgrade, a downgrade, a webhook and a renewal.
 */
export function creditsFor(
  config: Pick<ShopConfig, "customCredits"> | null | undefined,
  planCredits: number,
) {
  return hasCustomPlan(config) ? (config!.customCredits as number) : planCredits;
}

/** What the merchant should see their plan called. */
export function planLabelFor(config: Pick<ShopConfig, "customCredits" | "customPlanLabel" | "plan">) {
  if (hasCustomPlan(config)) return config.customPlanLabel || "Custom";
  return getPlan(config.plan).label;
}

/**
 * Grants or clears a custom plan.
 *
 * Clearing puts the store back on its plan's own allowance immediately, rather
 * than leaving it on the custom number until something else happens to sync it.
 */
export async function setCustomPlan(params: {
  shop: string;
  label: string | null;
  credits: number | null;
  note: string | null;
  setBy: string;
}) {
  const clearing = params.credits == null;
  const existing = await db.shopConfig.findUnique({ where: { shop: params.shop } });
  if (!existing) throw new Error("Unknown store.");

  const planCredits = getPlan(existing.plan).credits;

  return db.shopConfig.update({
    where: { shop: params.shop },
    data: clearing
      ? {
          customPlanLabel: null,
          customCredits: null,
          customNote: null,
          customSetAt: null,
          customSetBy: null,
          monthlyCredits: planCredits,
        }
      : {
          customPlanLabel: params.label?.trim() || "Custom",
          customCredits: params.credits,
          customNote: params.note?.trim() || null,
          customSetAt: new Date(),
          customSetBy: params.setBy,
          monthlyCredits: params.credits as number,
        },
  });
}
