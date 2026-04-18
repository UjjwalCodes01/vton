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
  buildSubscriptionLineItems,
  cancelAllActiveSubscriptions,
  getPlan,
  SUBSCRIPTION_CREATE_MUTATION,
  syncShopPlanFromShopifyBilling,
} from "../billing.server";
import { useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const isBillingCallback = url.searchParams.has("charge_id");

  let activationMessage: string | null = null;
  if (isBillingCallback) {
    const sync = await syncShopPlanFromShopifyBilling(admin, shop);
    activationMessage = sync.message;
  }

  const config = await db.shopConfig.findUnique({ where: { shop } });
  const currentPlan = getPlan(config?.plan ?? "free");

  return { currentPlan, plans: PLANS, activationMessage };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const planName = String(formData.get("plan"));
  const interval = (formData.get("interval") as "EVERY_30_DAYS" | "ANNUAL") ?? "EVERY_30_DAYS";
  const plan = getPlan(planName);

  // Edge case: cannot subscribe to annual with no annual price
  if (interval === "ANNUAL" && plan.annualPrice <= 0) {
    return { success: false, message: "Annual billing is not available for this plan.", confirmationUrl: null };
  }

  if (plan.monthlyPrice === 0) {
    // Downgrade to free: cancel existing Shopify subscription
    await cancelAllActiveSubscriptions(admin);

    await db.shopConfig.upsert({
      where: { shop },
      create: {
        shop,
        plan: "free",
        monthlyCredits: 10,
        billingId: null,
        creditsUsed: 0,
        overageChargesTotal: 0,
        billingCycleStart: new Date(),
      },
      update: {
        plan: "free",
        monthlyCredits: 10,
        billingId: null,
        creditsUsed: 0,
        overageChargesTotal: 0,
        billingCycleStart: new Date(),
      },
    });
    return { success: true, message: "Successfully downgraded to Free plan.", confirmationUrl: null };
  }

  const isTest = process.env.NODE_ENV !== "production";
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing?shop=${shop}`;

  const response = await admin.graphql(SUBSCRIPTION_CREATE_MUTATION, {
    variables: {
      name: `FabricVTON ${plan.label}${interval === "ANNUAL" ? " (Annual)" : ""}`,
      returnUrl,
      test: isTest,
      lineItems: buildSubscriptionLineItems(plan, interval),
    },
  });

  const json = await response.json();
  const result = json.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    return { success: false, message: result.userErrors[0].message, confirmationUrl: null };
  }

  const confirmationUrl = result?.confirmationUrl;
  if (confirmationUrl) {
    return { success: true, confirmationUrl };
  }

  return { success: false, message: "Could not create subscription.", confirmationUrl: null };
};

// ─── Billing page UI ──────────────────────────────────────────────────────────
export default function Billing() {
  const { currentPlan, plans, activationMessage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [billingInterval, setBillingInterval] = useState<"EVERY_30_DAYS" | "ANNUAL">("EVERY_30_DAYS");

  const isSubmitting = fetcher.state !== "idle";
  const paidPlans = plans.filter((p) => p.monthlyPrice > 0);

  useEffect(() => {
    if (activationMessage) shopify.toast.show(activationMessage);
    if (fetcher.data?.confirmationUrl) {
      window.open(fetcher.data.confirmationUrl, "_top");
    } else if (fetcher.data?.success && !fetcher.data.confirmationUrl) {
      shopify.toast.show(fetcher.data.message ?? "Plan updated.");
    }
  }, [activationMessage, fetcher.data, shopify]);

  return (
    <s-page heading="Billing & Plans">

      {/* Error banner */}
      {fetcher.data && !fetcher.data.success && (
        <s-banner tone="critical">
          <p>{fetcher.data.message}</p>
        </s-banner>
      )}

      {/* Current plan summary */}
      <s-section heading="Your Current Plan">
        <s-card>
          <div style={{ padding: "20px" }}>
            <div className="fv-flex fv-items-center fv-justify-between fv-flex-wrap" style={{ gap: "16px" }}>
              <div>
                <div className="fv-text-sm fv-text-subdued fv-mb-sm">ACTIVE PLAN</div>
                <div className="fv-flex fv-items-center fv-gap-sm">
                  <span style={{ fontSize: "24px", fontWeight: "bold" }} className="accent">{currentPlan.label}</span>
                  <span className="fv-badge success">Active</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="fv-text-sm fv-text-subdued fv-mb-sm">MONTHLY ALLOWANCE</div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>
                  {currentPlan.credits} <span className="fv-text-sm fv-text-subdued" style={{ fontWeight: "normal" }}>try-ons</span>
                </div>
              </div>
            </div>
            {currentPlan.overagePrice > 0 && (
              <div className="fv-mt-md fv-text-sm fv-text-subdued" style={{ borderTop: "1px solid var(--s-color-border)", paddingTop: "12px" }}>
                💡 Additional try-ons beyond your limit are billed at <strong>${currentPlan.overagePrice.toFixed(2)}</strong> each (capped at ${currentPlan.monthlyOverageCap}/mo).
              </div>
            )}
          </div>
        </s-card>
      </s-section>

      {/* Billing interval toggle */}
      <s-section heading="Available Plans">
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "28px", alignItems: "center" }}>
          <button
            onClick={() => setBillingInterval("EVERY_30_DAYS")}
            style={{
              padding: "8px 20px", borderRadius: "8px", border: "2px solid",
              borderColor: billingInterval === "EVERY_30_DAYS" ? "var(--s-color-interactive)" : "var(--s-color-border)",
              background: billingInterval === "EVERY_30_DAYS" ? "var(--s-color-interactive)" : "transparent",
              color: billingInterval === "EVERY_30_DAYS" ? "#fff" : "inherit",
              cursor: "pointer", fontWeight: "600",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("ANNUAL")}
            style={{
              padding: "8px 20px", borderRadius: "8px", border: "2px solid",
              borderColor: billingInterval === "ANNUAL" ? "var(--s-color-interactive)" : "var(--s-color-border)",
              background: billingInterval === "ANNUAL" ? "var(--s-color-interactive)" : "transparent",
              color: billingInterval === "ANNUAL" ? "#fff" : "inherit",
              cursor: "pointer", fontWeight: "600",
            }}
          >
            Annual <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.85 }}>Save ~20%</span>
          </button>
        </div>

        <div className="fv-plan-grid">
          {paidPlans.map((plan) => {
            const isCurrent = currentPlan.name === plan.name;
            const isRecommended = plan.featured === true;
            const isUpgrade = plan.monthlyPrice > currentPlan.monthlyPrice;
            const displayPrice = billingInterval === "ANNUAL"
              ? `$${(plan.annualPrice / 12).toFixed(0)}`
              : `$${plan.monthlyPrice}`;
            const savingsPercent = Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100);
            const displayCredits = billingInterval === "ANNUAL" ? plan.annualCredits : plan.credits;
            const creditLabel = billingInterval === "ANNUAL" ? "try-ons / year" : "try-ons / mo";

            return (
              <div key={plan.name} className={`fv-plan-card ${isCurrent ? "current" : ""} ${isRecommended ? "recommended" : ""}`}>
                {isRecommended && (
                  <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", color: "var(--s-color-interactive)", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    ⭐ MOST POPULAR
                  </div>
                )}

                <div className="fv-plan-name">{plan.label}</div>

                <div className="fv-plan-price">
                  {displayPrice}
                  <span style={{ fontSize: "14px", fontWeight: "normal", marginLeft: "4px" }}>/mo</span>
                </div>

                {billingInterval === "ANNUAL" ? (
                  <div style={{ fontSize: "12px", color: "green", fontWeight: "600", marginBottom: "12px" }}>
                    Save {savingsPercent}% · ${plan.annualPrice}/yr billed once
                  </div>
                ) : (
                  <div className="fv-text-sm fv-text-subdued fv-mb-md">billed monthly</div>
                )}

                <div style={{ minHeight: "130px", marginBottom: "20px" }}>
                  <div className="fv-plan-feature">
                    <strong>{displayCredits.toLocaleString()}</strong> {creditLabel}
                  </div>
                  {billingInterval === "EVERY_30_DAYS" && plan.overagePrice > 0 ? (
                    <div className="fv-plan-feature">
                      <strong>+${plan.overagePrice.toFixed(2)}</strong> per extra try-on
                      <br /><span style={{ fontSize: "11px", opacity: 0.7 }}>(capped at ${plan.monthlyOverageCap}/mo)</span>
                    </div>
                  ) : billingInterval === "ANNUAL" ? (
                    <div className="fv-plan-feature" style={{ color: "#888", fontSize: "12px" }}>
                      No overage charges on annual plan
                    </div>
                  ) : null}
                  <div className="fv-plan-feature">Lead capture & merchant analytics</div>
                  <div className="fv-plan-feature">
                    {plan.name === "scale" ? "✨ Dedicated priority support" : "Standard support"}
                  </div>
                </div>

                {isCurrent ? (
                  <div className="fv-w-full">
                    <s-button disabled>Current Plan</s-button>
                  </div>
                ) : (
                  <fetcher.Form method="post" className="fv-w-full">
                    <input type="hidden" name="plan" value={plan.name} />
                    <input type="hidden" name="interval" value={billingInterval} />
                    <span style={{ display: "block", width: "100%" }}>
                      <s-button
                        type="submit"
                        variant={isRecommended ? "primary" : undefined}
                        loading={isSubmitting && fetcher.formData?.get("plan") === plan.name}
                      >
                        {isUpgrade ? "Upgrade" : "Downgrade"}
                      </s-button>
                    </span>
                  </fetcher.Form>
                )}
              </div>
            );
          })}
        </div>

        {/* Downgrade to free */}
        {currentPlan.monthlyPrice > 0 && (
          <fetcher.Form method="post" style={{ marginTop: "24px", textAlign: "center" }}>
            <input type="hidden" name="plan" value="free" />
            <input type="hidden" name="interval" value="EVERY_30_DAYS" />
            <s-button
              variant="plain"
              type="submit"
              loading={isSubmitting && fetcher.formData?.get("plan") === "free"}
            >
              Downgrade to Free (10 try-ons/mo)
            </s-button>
          </fetcher.Form>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
