import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import db from "../db.server";
import {
  PLANS,
  OVERAGE_BILLING_ENABLED,
  getPlan,
  buildManagedPricingUrl,
  syncShopPlanFromShopifyBilling,
} from "../billing.server";
import { useEffect, useState } from "react";

// ─── Loader ───────────────────────────────────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  // Shopify redirects back here after the merchant picks a plan. Paid plans carry
  // ?charge_id=; a free plan produces no charge and returns only ?plan_handle=,
  // so gating on charge_id alone silently skips every downgrade.
  let activationMessage: string | null = null;
  if (url.searchParams.has("charge_id") || url.searchParams.has("plan_handle")) {
    const sync = await syncShopPlanFromShopifyBilling(admin, shop);
    activationMessage = sync.message;
  }

  const config = await db.shopConfig.findUnique({ where: { shop } });
  const currentPlan = getPlan(config?.plan ?? "free");

  return {
    currentPlan,
    plans: PLANS,
    activationMessage,
    overageEnabled: OVERAGE_BILLING_ENABLED,
  };
};

// ─── Action: hand the merchant off to Shopify's plan picker ──────────────────
// This app uses Managed Pricing, so Shopify owns accept / decline / change /
// cancel. Our only job is to redirect at the TOP level — window.open is blocked
// by the embedded iframe sandbox, which is why the buttons previously did
// nothing at all.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);

  return redirect(buildManagedPricingUrl(session.shop), { target: "_top" });
};

// ─── Billing page UI ──────────────────────────────────────────────────────────
export default function Billing() {
  const { currentPlan, plans, activationMessage, overageEnabled } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  // Which plan's button was clicked, so only that one shows a spinner.
  // The action ignores planName — Shopify's picker lists every plan — but it
  // still tells us which button is pending.
  const pendingPlan = fetcher.formData?.get("planName");
  const [billingInterval, setBillingInterval] = useState<"EVERY_30_DAYS" | "ANNUAL">(
    "EVERY_30_DAYS",
  );
  const annual = billingInterval === "ANNUAL";

  const paidPlans = plans.filter((p) => p.monthlyPrice > 0);

  useEffect(() => {
    if (activationMessage) shopify.toast.show(activationMessage);
  }, [activationMessage, shopify]);

  // Posting to the action returns a redirect to Shopify's plan picker.
  const changePlan = (planName: string) => {
    fetcher.submit({ planName }, { method: "post" });
  };

  return (
    <s-page heading="Plans and billing">
      <s-section heading="Current plan">
        <s-stack gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-heading>{currentPlan.label}</s-heading>
            <s-badge tone="success">Active</s-badge>
          </s-stack>
          <s-text color="subdued">
            {currentPlan.credits.toLocaleString("en-US")} try-ons per month
          </s-text>
          {overageEnabled && currentPlan.overagePrice > 0 && (
            <s-paragraph>
              If you use your full allowance before the cycle ends, try-ons keep
              working at ${currentPlan.overagePrice.toFixed(2)} each, billed
              through Shopify and capped at ${currentPlan.monthlyOverageCap} per
              month.
            </s-paragraph>
          )}
          <s-text color="subdued">
            Change or cancel anytime. Charges appear on your Shopify bill.
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Plans">
        <s-stack gap="base">
          <s-stack direction="inline" gap="small-200">
            <s-press-button pressed={!annual} onClick={() => setBillingInterval("EVERY_30_DAYS")}>
              Monthly
            </s-press-button>
            <s-press-button pressed={annual} onClick={() => setBillingInterval("ANNUAL")}>
              Annual (save about 20%)
            </s-press-button>
          </s-stack>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="base">
            {paidPlans.map((plan) => {
              const isCurrent = currentPlan.name === plan.name;
              const isRecommended = plan.featured === true;
              const isUpgrade = plan.monthlyPrice > currentPlan.monthlyPrice;
              const monthlyEquivalent = annual
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;
              const savingsPercent = Math.round(
                (1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100,
              );
              const credits = annual ? plan.annualCredits : plan.credits;

              return (
                <s-box
                  key={plan.name}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  borderColor={isRecommended ? "strong" : "base"}
                >
                  <s-stack gap="base">
                    <s-stack direction="inline" gap="small-200" alignItems="center">
                      <s-heading>{plan.label}</s-heading>
                      {isCurrent && <s-badge tone="success">Current</s-badge>}
                      {isRecommended && !isCurrent && <s-badge tone="info">Most popular</s-badge>}
                    </s-stack>

                    <s-stack gap="small-100">
                      <s-text type="strong">${monthlyEquivalent}/month</s-text>
                      <s-text color="subdued">
                        {annual
                          ? `$${plan.annualPrice} billed yearly, save ${savingsPercent}%`
                          : "Billed monthly"}
                      </s-text>
                    </s-stack>

                    <s-unordered-list>
                      <s-list-item>
                        {credits.toLocaleString("en-US")} try-ons per {annual ? "year" : "month"}
                      </s-list-item>
                      <s-list-item>
                        {overageEnabled && plan.overagePrice > 0
                          ? `Extra try-ons $${plan.overagePrice.toFixed(2)} each, up to $${plan.monthlyOverageCap}/month`
                          : "No surprise charges: the allowance is your limit"}
                      </s-list-item>
                      <s-list-item>Lead capture and analytics</s-list-item>
                      <s-list-item>
                        {plan.name === "scale" ? "Priority support" : "Standard support"}
                      </s-list-item>
                    </s-unordered-list>

                    {isCurrent ? (
                      <s-button disabled inlineSize="fill">
                        Current plan
                      </s-button>
                    ) : (
                      <s-button
                        inlineSize="fill"
                        variant={isRecommended ? "primary" : "secondary"}
                        loading={pendingPlan === plan.name}
                        onClick={() => changePlan(plan.name)}
                      >
                        {isUpgrade ? `Upgrade to ${plan.label}` : `Switch to ${plan.label}`}
                      </s-button>
                    )}
                  </s-stack>
                </s-box>
              );
            })}
          </s-grid>

          {currentPlan.monthlyPrice > 0 && (
            <s-stack direction="inline">
              <s-button
                variant="tertiary"
                loading={pendingPlan === "free"}
                onClick={() => changePlan("free")}
              >
                Downgrade to Basic (10 try-ons per month)
              </s-button>
            </s-stack>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
