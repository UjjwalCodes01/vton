// Billing plan definitions and helpers for FabricVTON
// Uses Shopify Billing API via GraphQL

import db from "./db.server";

export type PlanName = "free" | "starter" | "growth" | "pro";

export interface Plan {
  name: PlanName;
  label: string;
  monthlyPrice: number; // 0 for free
  credits: number;      // monthly try-on generations included
  overagePrice: number; // USD per additional try-on
  annualPrice?: number;
  monthlyOverageCap?: number;
}

export const PLANS: Plan[] = [
  {
    name: "free",
    label: "Free",
    monthlyPrice: 0,
    credits: 25,
    overagePrice: 0, // no overages on free plan
  },
  {
    name: "starter",
    label: "Starter",
    monthlyPrice: 4.99,
    credits: 100,
    overagePrice: 0.17,
    annualPrice: 49,
    monthlyOverageCap: 49,
  },
  {
    name: "growth",
    label: "Growth",
    monthlyPrice: 19.99,
    credits: 500,
    overagePrice: 0.12,
    annualPrice: 199,
    monthlyOverageCap: 199,
  },
  {
    name: "pro",
    label: "Pro",
    monthlyPrice: 99,
    credits: 3000,
    overagePrice: 0.10,
    annualPrice: 999,
    monthlyOverageCap: 999,
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

const SHOPIFY_ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2025-10";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "ACCEPTED"]);

// Shopify AppSubscriptionCreate mutation (for paid plans)
export const SUBSCRIPTION_CREATE_MUTATION = `#graphql
  mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
    appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, trialDays: 7, test: $test) {
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
export const USAGE_RECORD_CREATE_MUTATION = `#graphql
  mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId,
      price: $price,
      description: $description,
    ) {
      userErrors {
        field
        message
      }
      appUsageRecord {
        id
      }
    }
  }
`;

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

export function buildSubscriptionLineItems(plan: Plan) {
  const lineItems: Array<Record<string, unknown>> = [
    {
      plan: {
        appRecurringPricingDetails: {
          price: { amount: plan.monthlyPrice, currencyCode: "USD" },
          interval: "EVERY_30_DAYS",
        },
      },
    },
  ];

  if (plan.overagePrice > 0) {
    lineItems.push({
      plan: {
        appUsagePricingDetails: {
          cappedAmount: {
            amount: plan.monthlyOverageCap ?? 49,
            currencyCode: "USD",
          },
          terms: `$${plan.overagePrice.toFixed(2)} per additional try-on generation`,
        },
      },
    });
  }

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
  if (!activeSubscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(activeSubscription.status)) {
    return {
      synced: false,
      plan: null,
      message: "No active paid Shopify subscription found.",
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

async function shopGraphqlRequest<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const normalizedShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const response = await fetch(
    `https://${normalizedShop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    throw new Error(
      json.errors?.[0]?.message || `Shopify Admin API request failed with status ${response.status}`
    );
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Shopify GraphQL request failed");
  }

  return json.data as T;
}

export async function createOverageUsageRecord(params: {
  shop: string;
  amount: number;
  description: string;
}) {
  const { shop, amount, description } = params;
  if (amount <= 0) {
    return { charged: false, reason: "No overage amount" };
  }

  const session = await db.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { id: "asc" },
  });

  if (!session?.accessToken) {
    return { charged: false, reason: "Offline access token missing" };
  }

  const currentData = await shopGraphqlRequest<{
    currentAppInstallation?: { activeSubscriptions?: ActiveSubscription[] };
  }>(shop, session.accessToken, CURRENT_APP_SUBSCRIPTIONS_QUERY);

  const activeSubscription = pickActiveSubscription(
    currentData.currentAppInstallation?.activeSubscriptions ?? []
  );
  if (!activeSubscription) {
    return { charged: false, reason: "No active Shopify subscription" };
  }

  const usageLineItemId =
    activeSubscription.lineItems?.find(
      (item) => item.plan?.pricingDetails?.__typename === "AppUsagePricing"
    )?.id ?? null;

  if (!usageLineItemId) {
    return {
      charged: false,
      reason: "Active Shopify subscription has no usage billing line item",
    };
  }

  const usageData = await shopGraphqlRequest<{
    appUsageRecordCreate?: {
      userErrors?: Array<{ message?: string }>;
      appUsageRecord?: { id?: string };
    };
  }>(shop, session.accessToken, USAGE_RECORD_CREATE_MUTATION, {
    subscriptionLineItemId: usageLineItemId,
    price: {
      amount: Number(amount.toFixed(2)),
      currencyCode: "USD",
    },
    description,
  });

  const usageResult = usageData.appUsageRecordCreate;
  if (usageResult?.userErrors?.length) {
    return {
      charged: false,
      reason: usageResult.userErrors[0]?.message || "Usage record rejected by Shopify",
    };
  }

  return {
    charged: Boolean(usageResult?.appUsageRecord?.id),
    usageRecordId: usageResult?.appUsageRecord?.id ?? null,
  };
}
