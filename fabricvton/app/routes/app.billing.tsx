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

  // Shopify redirects back here with ?charge_id= after the merchant
  // approves or changes a plan on Shopify's managed pricing page.
  let activationMessage: string | null = null;
  if (url.searchParams.has("charge_id")) {
    const sync = await syncShopPlanFromShopifyBilling(admin, shop);
    activationMessage = sync.message;
  }

  const config = await db.shopConfig.findUnique({ where: { shop } });
  const currentPlan = getPlan(config?.plan ?? "free");

  return { currentPlan, plans: PLANS, activationMessage };
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
  const { currentPlan, plans, activationMessage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  // Which plan's button was clicked, so only that one shows a spinner.
  // The action ignores planName — Shopify's picker lists every plan — but it
  // still tells us which button is pending.
  const pendingPlan = fetcher.formData?.get("planName");
  const [billingInterval, setBillingInterval] = useState<
    "EVERY_30_DAYS" | "ANNUAL"
  >("EVERY_30_DAYS");

  const paidPlans = plans.filter((p) => p.monthlyPrice > 0);

  useEffect(() => {
    if (activationMessage) shopify.toast.show(activationMessage);
  }, [activationMessage, shopify]);

  // Posting to the action returns a redirect to Shopify's charge approval page.
  const changePlan = (planName: string) => {
    fetcher.submit({ planName }, { method: "post" });
  };

  return (
    <s-page heading="Billing & Plans">
      {/* ── Current Plan ── */}
      <s-section heading="Your Current Plan">
        <s-card>
          <div style={{ padding: "20px" }}>
            <div
              className="fv-flex fv-items-center fv-justify-between fv-flex-wrap"
              style={{ gap: "16px" }}
            >
              <div>
                <div className="fv-text-sm fv-text-subdued fv-mb-sm">
                  ACTIVE PLAN
                </div>
                <div className="fv-flex fv-items-center fv-gap-sm">
                  <span
                    style={{ fontSize: "24px", fontWeight: "bold" }}
                    className="accent"
                  >
                    {currentPlan.label}
                  </span>
                  <span className="fv-badge success">Active</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="fv-text-sm fv-text-subdued fv-mb-sm">
                  MONTHLY ALLOWANCE
                </div>
                <div style={{ fontSize: "16px", fontWeight: "600" }}>
                  {currentPlan.credits}{" "}
                  <span
                    className="fv-text-sm fv-text-subdued"
                    style={{ fontWeight: "normal" }}
                  >
                    try-ons
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <span className="fv-text-sm fv-text-subdued">
                Upgrade, downgrade, or cancel anytime.
              </span>
            </div>
          </div>
        </s-card>
      </s-section>

      {/* ── Available Plans (display only) ── */}
      <s-section heading="Available Plans">
        {/* Billing interval toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "28px",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setBillingInterval("EVERY_30_DAYS")}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "2px solid",
              borderColor:
                billingInterval === "EVERY_30_DAYS"
                  ? "var(--s-color-interactive)"
                  : "var(--s-color-border)",
              background:
                billingInterval === "EVERY_30_DAYS"
                  ? "var(--s-color-interactive)"
                  : "transparent",
              color: billingInterval === "EVERY_30_DAYS" ? "#fff" : "#111",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("ANNUAL")}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "2px solid",
              borderColor:
                billingInterval === "ANNUAL"
                  ? "var(--s-color-interactive)"
                  : "var(--s-color-border)",
              background:
                billingInterval === "ANNUAL"
                  ? "var(--s-color-interactive)"
                  : "transparent",
              color: billingInterval === "ANNUAL" ? "#fff" : "#111",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Annual{" "}
            <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.85 }}>
              Save ~20%
            </span>
          </button>
        </div>

        <div className="fv-plan-grid">
          {paidPlans.map((plan) => {
            const isCurrent = currentPlan.name === plan.name;
            const isRecommended = plan.featured === true;
            const isUpgrade = plan.monthlyPrice > currentPlan.monthlyPrice;
            const displayPrice =
              billingInterval === "ANNUAL"
                ? `$${(plan.annualPrice / 12).toFixed(0)}`
                : `$${plan.monthlyPrice}`;
            const savingsPercent = Math.round(
              (1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100
            );
            const displayCredits =
              billingInterval === "ANNUAL" ? plan.annualCredits : plan.credits;
            const creditLabel =
              billingInterval === "ANNUAL" ? "try-ons / year" : "try-ons / mo";

            return (
              <div
                key={plan.name}
                className={`fv-plan-card ${isCurrent ? "current" : ""} ${
                  isRecommended ? "recommended" : ""
                }`}
              >
                <div className="fv-plan-name">{plan.label}</div>

                <div className="fv-plan-price">
                  {displayPrice}
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "normal",
                      marginLeft: "4px",
                    }}
                  >
                    /mo
                  </span>
                </div>

                {billingInterval === "ANNUAL" ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "green",
                      fontWeight: "600",
                      marginBottom: "12px",
                    }}
                  >
                    Save {savingsPercent}% · ${plan.annualPrice}/yr billed once
                  </div>
                ) : (
                  <div className="fv-text-sm fv-text-subdued fv-mb-md">
                    billed monthly
                  </div>
                )}

                <div style={{ minHeight: "130px", marginBottom: "20px" }}>
                  <div className="fv-plan-feature">
                    <strong>{displayCredits.toLocaleString()}</strong>{" "}
                    {creditLabel}
                  </div>
                  <div
                    className="fv-plan-feature"
                    style={{ color: "#888", fontSize: "12px" }}
                  >
                    No surprise charges — the allowance is your limit
                  </div>
                  <div className="fv-plan-feature">
                    Lead capture &amp; merchant analytics
                  </div>
                  <div className="fv-plan-feature">
                    {plan.name === "scale"
                      ? "✨ Dedicated priority support"
                      : "Standard support"}
                  </div>
                </div>

                {isCurrent ? (
                  <div className="fv-w-full">
                    <s-button disabled>Current Plan</s-button>
                  </div>
                ) : (
                  <div className="fv-w-full">
                    <s-button
                      variant={isRecommended ? "primary" : undefined}
                      loading={pendingPlan === plan.name}
                      onClick={() => changePlan(plan.name)}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </s-button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Downgrade to free */}
        {currentPlan.monthlyPrice > 0 && (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <s-button
              variant="tertiary"
              loading={pendingPlan === "free"}
              onClick={() => changePlan("free")}
            >
              Downgrade to Basic (10 try-ons/mo)
            </s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
