// Billing plan definitions and helpers for FabricVTON
// Uses Shopify Billing API via GraphQL

export type PlanName = "free" | "starter" | "growth" | "pro";

export interface Plan {
  name: PlanName;
  label: string;
  monthlyPrice: number; // 0 for free
  credits: number;      // monthly try-on generations included
  overagePrice: number; // USD per additional try-on
  annualPrice?: number;
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
  },
  {
    name: "growth",
    label: "Growth",
    monthlyPrice: 19.99,
    credits: 500,
    overagePrice: 0.12,
    annualPrice: 199,
  },
  {
    name: "pro",
    label: "Pro",
    monthlyPrice: 99,
    credits: 3000,
    overagePrice: 0.10,
    annualPrice: 999,
  },
];

export const getPlan = (name: string): Plan =>
  PLANS.find((p) => p.name === name) ?? PLANS[0];

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
