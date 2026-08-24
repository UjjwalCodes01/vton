// Billing plan definitions and helpers for FabricVTON
// Uses Shopify Billing API via GraphQL

import db from "./db.server";

export type PlanName = "free" | "starter" | "growth" | "pro" | "scale";

export interface Plan {
  name: PlanName;
  label: string;
  monthlyPrice: number;       // monthly price in USD (0 for free)
  annualPrice: number;        // annual price in USD (one-time charge per year)
  credits: number;            // monthly try-on credits included
  annualCredits: number;      // try-ons included in the full year (for annual billing)
  // Overage billing is intentionally disabled. Shopify App Pricing owns the plans
  // and none of them carry a usage component, so any per-try-on charge advertised
  // here would never actually be levied. The monthly allowance is a hard cap.
  // Kept at 0 so the pricing UI and line-item builder both stay silent about it.
  overagePrice: number;
  monthlyOverageCap: number;
  featured?: boolean;         // highlight in UI
}

// ─── Pricing plans – source of truth for both billing and the UI ──────────────
// Matches the approved spreadsheet exactly:
//   Starter  $9/mo  ($86/yr)   50 cr/mo   (600/yr)   $0.18/overage
//   Growth   $49/mo ($470/yr)  400 cr/mo  (4800/yr)  $0.13/overage
//   Pro      $99/mo ($950/yr)  1000 cr/mo (12000/yr) $0.10/overage
//   Scale    $219/mo($2102/yr) 2500 cr/mo (30000/yr) $0.08/overage
export const PLANS: Plan[] = [
  {
    name: "free",
    label: "Basic",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 10,
    annualCredits: 120,
    overagePrice: 0,
    monthlyOverageCap: 0,
  },
  {
    name: "starter",
    label: "Starter",
    monthlyPrice: 9,
    annualPrice: 86,
    credits: 50,
    annualCredits: 600,
    overagePrice: 0,
    monthlyOverageCap: 0,
  },
  {
    name: "growth",
    label: "Growth",
    monthlyPrice: 49,
    annualPrice: 470,
    credits: 400,
    annualCredits: 4800,
    overagePrice: 0,
    monthlyOverageCap: 0,
    featured: true,
  },
  {
    name: "pro",
    label: "Pro",
    monthlyPrice: 99,
    annualPrice: 950,
    credits: 1000,
    annualCredits: 12000,
    overagePrice: 0,
    monthlyOverageCap: 0,
  },
  {
    name: "scale",
    label: "Scale",
    monthlyPrice: 219,
    annualPrice: 2102,
    credits: 2500,
    annualCredits: 30000,
    overagePrice: 0,
    monthlyOverageCap: 0,
  },
];

export const getPlan = (name: string): Plan =>
  PLANS.find((p) => p.name === name) ?? PLANS[0];

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "ACCEPTED"]);

// Shopify AppSubscriptionCreate mutation (for paid plans)
export const SUBSCRIPTION_CREATE_MUTATION = `#graphql
  mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean, $trialDays: Int) {
    appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, trialDays: $trialDays, test: $test) {
      userErrors {
        field
        message
      }
      confirmationUrl
      appSubscription {
        id
        status
      }
    }
  }
`;

export const CURRENT_APP_SUBSCRIPTIONS_QUERY = `#graphql
  query currentAppSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        lineItems {
          id
          plan {
            pricingDetails {
              __typename
              ... on AppRecurringPricing {
                interval
                price {
                  amount
                  currencyCode
                }
              }
              ... on AppUsagePricing {
                terms
                cappedAmount {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const SUBSCRIPTION_CANCEL_MUTATION = `#graphql
  mutation appSubscriptionCancel($id: ID!, $prorate: Boolean) {
    appSubscriptionCancel(id: $id, prorate: $prorate) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

// Shopify AppUsageRecordCreate mutation (for overages)

type ActiveSubscription = {
  id: string;
  name: string;
  status: string;
  lineItems?: Array<{
    id: string;
    plan?: {
      pricingDetails?: {
        __typename?: string;
      };
    };
  }>;
};

function inferPlanFromSubscriptionName(name: string): PlanName {
  const lowered = name.toLowerCase();
  for (const plan of PLANS) {
    if (lowered.includes(plan.name) || lowered.includes(plan.label.toLowerCase())) {
      return plan.name;
    }
  }
  return "free";
}

function pickActiveSubscription(subscriptions: ActiveSubscription[]): ActiveSubscription | null {
  const active = subscriptions.find((sub) => ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status));
  return active ?? subscriptions[0] ?? null;
}

async function readGraphqlJson(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  const json = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Shopify GraphQL request failed");
  }

  return json;
}

export function buildSubscriptionLineItems(plan: Plan, interval: "EVERY_30_DAYS" | "ANNUAL" = "EVERY_30_DAYS") {
  const price = interval === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;

  const lineItems: Array<Record<string, unknown>> = [
    {
      plan: {
        appRecurringPricingDetails: {
          price: { amount: price, currencyCode: "USD" },
          interval,
        },
      },
    },
  ];

  return lineItems;
}

export async function syncShopPlanFromShopifyBilling(
  admin: AdminGraphqlClient,
  shop: string
): Promise<{ synced: boolean; plan: PlanName | null; message: string }> {
  const json = await readGraphqlJson(admin.graphql(CURRENT_APP_SUBSCRIPTIONS_QUERY));
  const subscriptions =
    (json.data?.currentAppInstallation as { activeSubscriptions?: ActiveSubscription[] } | undefined)
      ?.activeSubscriptions ?? [];

  const activeSubscription = pickActiveSubscription(subscriptions);

  // No active subscription under Shopify App Pricing means the merchant is on the
  // free entry tier — they downgraded or cancelled. This MUST be written back:
  // leaving the old paid plan in place is what makes a downgrade look broken to
  // the merchant, because the app keeps reporting the previous allowance.
  if (!activeSubscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(activeSubscription.status)) {
    const entryPlan = getPlan("free");
    const existing = await db.shopConfig.findUnique({ where: { shop } });
    const planChanged = !existing || existing.plan !== entryPlan.name;

    await db.shopConfig.upsert({
      where: { shop },
      create: {
        shop,
        plan: entryPlan.name,
        billingId: null,
        monthlyCredits: entryPlan.credits,
        creditsUsed: 0,
        billingCycleStart: new Date(),
        isEnabled: true,
      },
      update: {
        plan: entryPlan.name,
        billingId: null,
        monthlyCredits: entryPlan.credits,
        // Start a fresh cycle on an actual change, mirroring the paid path.
        ...(planChanged
          ? { creditsUsed: 0, billingCycleStart: new Date() }
          : {}),
      },
    });

    return {
      synced: planChanged,
      plan: entryPlan.name,
      message: planChanged
        ? `Plan changed to ${entryPlan.label} (${entryPlan.credits} try-ons/mo).`
        : `You're on the ${entryPlan.label} plan.`,
    };
  }

  const planName = inferPlanFromSubscriptionName(activeSubscription.name);
  const plan = getPlan(planName);
  const existing = await db.shopConfig.findUnique({ where: { shop } });
  const shouldResetCycle =
    !existing ||
    existing.plan !== planName ||
    existing.billingId !== activeSubscription.id;

  await db.shopConfig.upsert({
    where: { shop },
    create: {
      shop,
      plan: plan.name,
      billingId: activeSubscription.id,
      monthlyCredits: plan.credits,
      creditsUsed: 0,
      overageChargesTotal: 0,
      billingCycleStart: new Date(),
      isEnabled: true,
    },
    update: {
      plan: plan.name,
      billingId: activeSubscription.id,
      monthlyCredits: plan.credits,
      isEnabled: true,
      ...(shouldResetCycle
        ? {
            creditsUsed: 0,
            overageChargesTotal: 0,
            billingCycleStart: new Date(),
          }
        : {}),
    },
  });

  return {
    synced: true,
    plan: plan.name,
    message: `Plan activated: ${plan.label}`,
  };
}

export async function cancelAllActiveSubscriptions(admin: AdminGraphqlClient) {
  const json = await readGraphqlJson(admin.graphql(CURRENT_APP_SUBSCRIPTIONS_QUERY));
  const subscriptions =
    (json.data?.currentAppInstallation as { activeSubscriptions?: ActiveSubscription[] } | undefined)
      ?.activeSubscriptions ?? [];

  for (const sub of subscriptions) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) {
      continue;
    }

    const cancelJson = await readGraphqlJson(
      admin.graphql(SUBSCRIPTION_CANCEL_MUTATION, {
        variables: {
          id: sub.id,
          prorate: false,
        },
      })
    );

    const cancelResult = cancelJson.data?.appSubscriptionCancel as
      | { userErrors?: Array<{ message?: string }> }
      | undefined;

    if (cancelResult?.userErrors?.length) {
      throw new Error(cancelResult.userErrors[0]?.message || "Failed to cancel existing Shopify subscription");
    }
  }
}

// ─── Managed Pricing ──────────────────────────────────────────────────────────
//
// This app uses Shopify App Pricing (formerly Managed Pricing): plans live in the
// Partner Dashboard and Shopify owns the whole accept / decline / change / cancel
// flow. Managed Pricing apps may NOT call appSubscriptionCreate — Shopify rejects
// it — so every plan change hands the merchant off to Shopify's own plan picker.
//
// None of those plans carry a usage component, so there is no overage billing.
// The monthly allowance is enforced as a hard cap in tryon.server.ts instead.

/**
 * Builds the Shopify-hosted plan selection page for this app.
 *
 * The merchant must be sent here at the TOP level, not inside the embedded
 * iframe — use the `redirect` helper from authenticate.admin with target "_top".
 */
export function buildManagedPricingUrl(shop: string): string {
  const storeHandle = shop.replace(/\.myshopify\.com$/, "");

  // Shopify identifies the app by its handle on this route. It is not derivable
  // from the API key, so it is configured explicitly.
  const appHandle =
    process.env.SHOPIFY_APP_HANDLE || process.env.SHOPIFY_API_KEY || "";

  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}
