import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import db from "../db.server";
import {
  PLANS,
  getPlan,
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

  // Build the Shopify-managed pricing plan change URL.
  // Shopify shows its own plan picker at this URL.
  const apiKey = process.env.SHOPIFY_API_KEY ?? "";
  const pricingPlanUrl = `shopify://admin/charges/${apiKey}/pricing_plans`;

  return { currentPlan, plans: PLANS, activationMessage, pricingPlanUrl };
};

// ─── Billing page UI ──────────────────────────────────────────────────────────
export default function Billing() {
  const { currentPlan, plans, activationMessage, pricingPlanUrl } =
    useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [billingInterval, setBillingInterval] = useState<
    "EVERY_30_DAYS" | "ANNUAL"
  >("EVERY_30_DAYS");

  const paidPlans = plans.filter((p) => p.monthlyPrice > 0);

  useEffect(() => {
    if (activationMessage) shopify.toast.show(activationMessage);
  }, [activationMessage, shopify]);

  // Redirect to Shopify's native managed pricing page.
  // window.open with '_top' breaks out of the embedded iframe.
  const handleChangePlan = () => {
    window.open(pricingPlanUrl, "_top");
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

            {currentPlan.overagePrice > 0 && (
              <div
                className="fv-mt-md fv-text-sm fv-text-subdued"
                style={{
                  borderTop: "1px solid var(--s-color-border)",
                  paddingTop: "12px",
                }}
              >
                💡 Additional try-ons beyond your limit are billed at{" "}
                <strong>${currentPlan.overagePrice.toFixed(2)}</strong> each
                (capped at ${currentPlan.monthlyOverageCap}/mo).
              </div>
            )}

            <div style={{ marginTop: "20px" }}>
              <span style={{ display: "inline-block" }}>
                <s-button variant="primary" onClick={handleChangePlan}>
                  Change Plan
                </s-button>
              </span>
              <span
                className="fv-text-sm fv-text-subdued"
                style={{ marginLeft: "12px" }}
              >
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
                  {billingInterval === "EVERY_30_DAYS" &&
                  plan.overagePrice > 0 ? (
                    <div className="fv-plan-feature">
                      <strong>+${plan.overagePrice.toFixed(2)}</strong> per
                      extra try-on
                      <br />
                      <span style={{ fontSize: "11px", opacity: 0.7 }}>
                        (capped at ${plan.monthlyOverageCap}/mo)
                      </span>
                    </div>
                  ) : billingInterval === "ANNUAL" ? (
                    <div
                      className="fv-plan-feature"
                      style={{ color: "#888", fontSize: "12px" }}
                    >
                      No overage charges on annual plan
                    </div>
                  ) : null}
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
                  <span
                    style={{ display: "block", width: "100%" }}
                    onClick={handleChangePlan}
                  >
                    <s-button
                      variant={isRecommended ? "primary" : undefined}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </s-button>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Downgrade to free */}
        {currentPlan.monthlyPrice > 0 && (
          <div
            style={{ marginTop: "24px", textAlign: "center" }}
            onClick={handleChangePlan}
          >
            <s-button variant="tertiary">
              Downgrade to Free (10 try-ons/mo)
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
