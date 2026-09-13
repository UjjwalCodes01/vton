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
  // Price per try-on once the monthly allowance is spent, and the ceiling on
  // those charges per cycle. These are only ever levied when the shop's Shopify
  // subscription actually carries a usage-charge meter — see
  // getOverageAvailability. Without one configured in the Partner Dashboard the
  // allowance behaves as a hard cap and nothing is advertised or billed.
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
    overagePrice: 0.18,
    monthlyOverageCap: 50,
  },
  {
    name: "growth",
    label: "Growth",
    monthlyPrice: 49,
    annualPrice: 470,
    credits: 400,
    annualCredits: 4800,
    overagePrice: 0.13,
    monthlyOverageCap: 100,
    featured: true,
  },
  {
    name: "pro",
    label: "Pro",
    monthlyPrice: 99,
    annualPrice: 950,
    credits: 1000,
    annualCredits: 12000,
    overagePrice: 0.10,
    monthlyOverageCap: 200,
  },
  {
    name: "scale",
    label: "Scale",
    monthlyPrice: 219,
    annualPrice: 2102,
    credits: 2500,
    annualCredits: 30000,
    overagePrice: 0.08,
    monthlyOverageCap: 500,
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

/** Shopify app subscriptions bill on a 30-day recurring interval. */
export const BILLING_CYCLE_DAYS = 30;

/**
 * True once the shop's current allowance period has elapsed.
 *
 * The allowance resets on this boundary and NOWHERE else. Resetting on plan
 * change instead would let a merchant refill by churning plans — burn the
 * allowance, downgrade to Basic, upgrade again, get a fresh balance — for
 * little more than the prorated difference.
 */
export function isBillingCycleDue(billingCycleStart: Date, now: Date = new Date()) {
  return (
    now.getTime() - new Date(billingCycleStart).getTime() >=
    BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000
  );
}

/** Suspensions we applied for billing reasons, so manual admin suspensions are never auto-cleared. */
export const BILLING_SUSPEND_PREFIX = "billing:";

/**
 * Whether the pricing UI may advertise per-try-on overage charges.
 *
 * Deliberately opt-in and default-off. Advertising a charge that Shopify has no
 * meter to collect is exactly what failed App Store requirement 1.2.2 before.
 * Turn this on only once every paid plan in the Partner Dashboard has a usage
 * charge configured matching overagePrice / monthlyOverageCap below.
 *
 * Runtime billing does not depend on this flag — chargeOverage always verifies
 * the real subscription — so a wrong value here can only affect what is shown.
 */
export const OVERAGE_BILLING_ENABLED =
  process.env.OVERAGE_BILLING_ENABLED === "true";

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
                balanceUsed {
                  amount
                  currencyCode
                }
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
        balanceUsed?: { amount?: string | number };
        cappedAmount?: { amount?: string | number };
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
        // Downgrading does not refill the allowance — see isBillingCycleDue.
        // A cycle roll also clears the in-flight overage hold: the approved cap
        // is per cycle, so carrying last cycle's reservations into the new one
        // would understate the new cap's headroom.
        ...(existing && isBillingCycleDue(existing.billingCycleStart)
          ? { creditsUsed: 0, overageReserved: 0, billingCycleStart: new Date() }
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

  // A plan change swaps the allowance but must NOT refill it — only a genuine
  // cycle rollover (or a first install) does that.
  const shouldResetCycle =
    !existing || isBillingCycleDue(existing.billingCycleStart);

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
      // An active subscription clears any suspension we applied for billing
      // reasons, but leaves an admin's manual suspension in place.
      ...(existing?.isSuspended &&
      existing.suspendReason?.startsWith(BILLING_SUSPEND_PREFIX)
        ? { isSuspended: false, suspendReason: null }
        : {}),
      ...(shouldResetCycle
        ? { creditsUsed: 0, overageReserved: 0, billingCycleStart: new Date() }
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

// ─── Usage-based top-ups ──────────────────────────────────────────────────────
//
// When a shop spends its monthly allowance early, try-ons can continue and be
// billed per generation — but ONLY if the merchant's Shopify subscription
// carries a usage-charge meter, which is configured per plan in the Partner
// Dashboard and approved by the merchant (they agree to a capped amount).
//
// Everything here degrades safely: with no meter configured, availability comes
// back false, the allowance stays a hard cap, and the UI advertises nothing.
// That keeps us from ever promising a charge Shopify cannot collect.

const SHOPIFY_ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04";

export const USAGE_RECORD_CREATE_MUTATION = `#graphql
  mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      price: $price
      description: $description
    ) {
      userErrors { field message }
      appUsageRecord { id }
    }
  }
`;

/**
 * Calls the Admin API with the shop's stored offline token.
 *
 * Needed because usage records are created from the storefront try-on path,
 * which runs in an app-proxy context and has no authenticated admin client.
 */
async function shopGraphqlRequest<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const host = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const response = await fetch(
    `https://${host}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
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

  if (!response.ok || json.errors?.length) {
    throw new Error(
      json.errors?.[0]?.message ||
        `Shopify Admin API request failed (${response.status})`
    );
  }

  return json.data as T;
}

async function offlineAccessToken(shop: string): Promise<string | null> {
  const session = await db.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { id: "asc" },
  });
  return session?.accessToken ?? null;
}

function toAmount(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface OverageAvailability {
  /** Whether extra try-ons can be billed right now */
  available: boolean;
  /** Why not, for logging and merchant-facing copy */
  reason?: string;
  usageLineItemId?: string;
  /** USD still billable this cycle under the merchant-approved cap */
  remainingCap: number;
}

const UNAVAILABLE = (reason: string): OverageAvailability => ({
  available: false,
  reason,
  remainingCap: 0,
});

/**
 * Whether this shop can be billed for try-ons beyond its allowance, and how
 * much headroom is left under the cap the merchant approved.
 */
export async function getOverageAvailability(
  shop: string
): Promise<OverageAvailability> {
  const accessToken = await offlineAccessToken(shop);
  if (!accessToken) return UNAVAILABLE("Offline access token missing");

  let subscriptions: ActiveSubscription[] = [];
  try {
    const data = await shopGraphqlRequest<{
      currentAppInstallation?: { activeSubscriptions?: ActiveSubscription[] };
    }>(shop, accessToken, CURRENT_APP_SUBSCRIPTIONS_QUERY);
    subscriptions = data.currentAppInstallation?.activeSubscriptions ?? [];
  } catch (error) {
    return UNAVAILABLE(
      error instanceof Error ? error.message : "Could not read subscription"
    );
  }

  const subscription = pickActiveSubscription(subscriptions);
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return UNAVAILABLE("No active Shopify subscription");
  }

  const usageLineItem = subscription.lineItems?.find(
    (item) => item.plan?.pricingDetails?.__typename === "AppUsagePricing"
  );
  if (!usageLineItem) {
    return UNAVAILABLE("Subscription has no usage-charge meter configured");
  }

  const details = usageLineItem.plan?.pricingDetails ?? {};
  const cap = toAmount(details.cappedAmount?.amount);
  const used = toAmount(details.balanceUsed?.amount);
  const remainingCap = Math.max(0, cap - used);

  if (remainingCap <= 0) {
    return UNAVAILABLE("Merchant-approved spending cap reached for this cycle");
  }

  return { available: true, usageLineItemId: usageLineItem.id, remainingCap };
}

/**
 * Bills a single try-on beyond the allowance. Never throws — a billing failure
 * must not break a generation the shopper already paid for in wait time.
 */
export async function chargeOverage(params: {
  shop: string;
  amount: number;
  description: string;
}): Promise<{ charged: boolean; reason?: string }> {
  const { shop, amount, description } = params;
  if (amount <= 0) return { charged: false, reason: "No overage amount" };

  try {
    const availability = await getOverageAvailability(shop);
    if (!availability.available || !availability.usageLineItemId) {
      return { charged: false, reason: availability.reason };
    }
    if (amount > availability.remainingCap) {
      return { charged: false, reason: "Charge would exceed the approved cap" };
    }

    const accessToken = await offlineAccessToken(shop);
    if (!accessToken) return { charged: false, reason: "Offline access token missing" };

    const data = await shopGraphqlRequest<{
      appUsageRecordCreate?: {
        userErrors?: Array<{ message?: string }>;
        appUsageRecord?: { id?: string };
      };
    }>(shop, accessToken, USAGE_RECORD_CREATE_MUTATION, {
      subscriptionLineItemId: availability.usageLineItemId,
      price: { amount: Number(amount.toFixed(2)), currencyCode: "USD" },
      description,
    });

    const result = data.appUsageRecordCreate;
    if (result?.userErrors?.length) {
      return { charged: false, reason: result.userErrors[0]?.message };
    }

    return { charged: true };
  } catch (error) {
    return {
      charged: false,
      reason: error instanceof Error ? error.message : "Usage record failed",
    };
  }
}
