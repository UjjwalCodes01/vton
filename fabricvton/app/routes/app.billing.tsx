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
import { useEffect } from "react";

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
  const plan = getPlan(planName);

  if (plan.monthlyPrice === 0) {
    // Downgrade to free
    await cancelAllActiveSubscriptions(admin);

    await db.shopConfig.upsert({
      where: { shop },
      create: {
        shop,
        plan: "free",
        monthlyCredits: 25,
        billingId: null,
        creditsUsed: 0,
        overageChargesTotal: 0,
        billingCycleStart: new Date(),
      },
      update: {
        plan: "free",
        monthlyCredits: 25,
        billingId: null,
        creditsUsed: 0,
        overageChargesTotal: 0,
        billingCycleStart: new Date(),
      },
    });
    return { success: true, message: "Successfully downgraded to Free plan.", confirmationUrl: null };
  }

  // Create a Shopify subscription charge
  const isTest = process.env.NODE_ENV !== "production";
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing?shop=${shop}`;

  const response = await admin.graphql(SUBSCRIPTION_CREATE_MUTATION, {
    variables: {
      name: `FabricVTON ${plan.label}`,
      returnUrl,
      test: isTest,
      lineItems: buildSubscriptionLineItems(plan),
    },
  });

  const json = await response.json();
  const result = json.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    return { success: false, message: result.userErrors[0].message, confirmationUrl: null };
  }

  const confirmationUrl = result?.confirmationUrl;
  if (confirmationUrl) {
    // We return the URL and let the client redirect out of the iframe
    return { success: true, confirmationUrl };
  }

  return { success: false, message: "Could not create subscription.", confirmationUrl: null };
};

export default function Billing() {
  const { currentPlan, plans, activationMessage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (activationMessage) {
      shopify.toast.show(activationMessage);
    }

    if (fetcher.data?.confirmationUrl) {
      // Securely break out of iframe to Shopify billing approval
      window.open(fetcher.data.confirmationUrl, "_top");
    } else if (fetcher.data?.success && !fetcher.data.confirmationUrl) {
      // Downgrade success toast
      shopify.toast.show(fetcher.data.message);
    }
  }, [activationMessage, fetcher.data, shopify]);

  return (
    <s-page heading="Billing & Plans">

      {fetcher.data && !fetcher.data.success && (
        <s-banner tone="critical">
          <p>{fetcher.data.message}</p>
        </s-banner>
      )}

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
                     💡 Note: Additional try-ons beyond your limit are billed automatically at <strong>${currentPlan.overagePrice.toFixed(2)}</strong> each.
                  </div>
               )}
            </div>
         </s-card>
      </s-section>

      <s-section heading="Available Plans">
        <div className="fv-plan-grid">
          {plans.map((plan) => {
            const isCurrent = currentPlan.name === plan.name;
            const isRecommended = plan.name === "growth"; // Arbitrary highlight

            return (
               <div key={plan.name} className={`fv-plan-card ${isCurrent ? 'current' : ''} ${isRecommended ? 'recommended' : ''}`}>
                  <div className="fv-plan-name">{plan.label}</div>
                  <div className="fv-plan-price">
                     {plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}`}
                  </div>
                  <div className="fv-text-sm fv-text-subdued fv-mb-md">per month</div>

                  <div style={{ minHeight: "120px", marginBottom: "20px" }}>
                     <div className="fv-plan-feature">
                        <strong>{plan.credits}</strong> try-ons included
                     </div>
                     {plan.overagePrice > 0 ? (
                        <div className="fv-plan-feature">
                        <strong>+${plan.overagePrice.toFixed(2)}</strong> per extra try-on
                        </div>
                     ) : (
                        <div className="fv-plan-feature">
                        No overage charges
                        </div>
                     )}
                     <div className="fv-plan-feature">
                        Priority Support
                     </div>
                  </div>

                  {isCurrent ? (
                     <div className="fv-w-full">
                        <s-button disabled>Current Plan</s-button>
                     </div>
                  ) : (
                     <fetcher.Form method="post" className="fv-w-full">
                        <input type="hidden" name="plan" value={plan.name} />
                        <span style={{ display: "block", width: "100%" }}>
                          <s-button
                             type="submit"
                             variant={plan.monthlyPrice > 0 && isRecommended ? "primary" : undefined}
                             loading={isSubmitting && fetcher.formData?.get("plan") === plan.name}
                          >
                             {plan.monthlyPrice === 0 ? "Downgrade" : "Upgrade"}
                          </s-button>
                        </span>
                     </fetcher.Form>
                  )}
               </div>
            );
          })}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
