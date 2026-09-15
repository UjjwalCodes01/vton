import { randomBytes } from "node:crypto";
import { Prisma, type BillingSubscription, type ShopConfig } from "@prisma/client";
import db from "../db.server";
import { BILLING_SUSPEND_PREFIX, getPlan, PLANS, type Plan } from "../billing.server";
import { originMatchesStore, WooAuthError } from "./auth.server";
import { hmacHex, safeEqual } from "./crypto.server";

// WooCommerce stores pay us through Razorpay subscriptions (Shopify stores are
// billed by Shopify). Monthly plans only, priced from PLANS.
//
// Plan changes are new subscriptions, not in-place updates: Razorpay refuses
// plan changes for subscriptions paid with Indian cards, UPI or eMandate, so an
// update-based design would work for some merchants and fail for others.
//   * Starting a plan or upgrading: the new subscription starts now with a
//     fresh allowance, and the previous one is cancelled when it activates.
//   * Downgrading: the new subscription starts when the current period ends,
//     and the current one is set to end then — nobody pays for two plans.
//   * Cancelling: the plan runs to the end of the paid period, then Basic.
//
// Razorpay is the source of truth. Webhooks and checkout returns only say
// "look again": syncSubscription() re-fetches the subscription and mirrors it,
// so duplicate, late or out-of-order events all converge on the same state.

const API_BASE = process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com";
export const BILLING_CURRENCY = (process.env.WOO_BILLING_CURRENCY ?? "USD").toUpperCase();

/** Monthly charges before a subscription needs renewing: Razorpay's 10-year limit. */
const TOTAL_MONTHLY_CHARGES = 120;
/** How long a checkout link stays payable. */
const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;
/** Renewals reset the allowance unless the lazy 30-day roll already did (see applyToStore). */
const RENEWAL_TOLERANCE_MS = 5 * 24 * 60 * 60 * 1000;

const ENDED = new Set(["halted", "cancelled", "completed", "expired", "paused"]);
const CANCELLABLE = new Set(["created", "authenticated", "active", "pending"]);

export const PAID_PLANS = PLANS.filter((plan) => plan.monthlyPrice > 0);

export function billingConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
}

/** Public base URL of this backend, for checkout links sent to merchants. */
export function publicAppUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
}

export function amountFor(plan: Plan) {
  return Math.round(plan.monthlyPrice * 100);
}

// ─── Razorpay API ──────────────────────────────────────────────────────────

export class RazorpayError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  start_at: number | null;
}

async function razorpay<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`${API_BASE}/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
  if (!response.ok) {
    throw new RazorpayError(response.status, json.error?.description || `Razorpay request failed (${response.status})`);
  }
  return json as T;
}

const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

/**
 * The Razorpay plan for one of our plans at its current price, created on
 * first use. Plans are immutable in Razorpay, hence the price in the key.
 */
async function providerPlanFor(plan: Plan) {
  const amount = amountFor(plan);
  const key = `${plan.name}:monthly:${BILLING_CURRENCY}:${amount}`;
  const existing = await db.billingProviderPlan.findUnique({ where: { key } });
  if (existing) return { providerPlanId: existing.providerPlanId, amount };

  const created = await razorpay<{ id: string }>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: {
      name: `Clothsy AI ${plan.label}`,
      amount,
      currency: BILLING_CURRENCY,
      description: `${plan.credits} virtual try-ons a month`,
    },
    notes: { clothsy_plan: plan.name },
  });
  try {
    await db.billingProviderPlan.create({ data: { key, providerPlanId: created.id } });
    return { providerPlanId: created.id, amount };
  } catch (error) {
    // Another request created it first; use theirs (ours is simply unused).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await db.billingProviderPlan.findUniqueOrThrow({ where: { key } });
      return { providerPlanId: row.providerPlanId, amount };
    }
    throw error;
  }
}

async function cancelAtRazorpay(row: BillingSubscription, atCycleEnd: boolean) {
  try {
    const sub = await razorpay<RazorpaySubscription>("POST", `/subscriptions/${encodeURIComponent(row.id)}/cancel`, {
      cancel_at_cycle_end: atCycleEnd,
    });
    await db.billingSubscription.update({
      where: { id: row.id },
      data: { status: sub.status, cancelAtCycleEnd: atCycleEnd || row.cancelAtCycleEnd, endedAt: toDate(sub.ended_at) },
    });
  } catch (error) {
    // Already cancelled or expired is the outcome we wanted; anything else is
    // logged loudly, because it can mean a merchant keeps being charged.
    const refreshed = await razorpay<RazorpaySubscription>("GET", `/subscriptions/${encodeURIComponent(row.id)}`).catch(() => null);
    if (refreshed && ENDED.has(refreshed.status)) {
      await db.billingSubscription.update({ where: { id: row.id }, data: { status: refreshed.status } });
      return;
    }
    console.error(`[Billing] Could not cancel Razorpay subscription ${row.id} for ${row.shop}:`, error);
    throw error;
  }
}

// ─── Merchant actions ──────────────────────────────────────────────────────

export interface BillingState {
  enabled: boolean;
  currency: string;
  plans: Array<{ name: string; label: string; price: number; credits: number; featured: boolean }>;
  current: {
    plan: string;
    label: string;
    status: string;
    renewsOrEndsAt: string | null;
    cancelAtCycleEnd: boolean;
    paymentIssue: boolean;
  } | null;
  scheduled: { plan: string; label: string; startsAt: string | null } | null;
}

/** What the plugin's Plan section shows. */
export async function billingState(store: ShopConfig): Promise<BillingState> {
  const [current, scheduled] = await Promise.all([
    store.billingId ? db.billingSubscription.findUnique({ where: { id: store.billingId } }) : null,
    db.billingSubscription.findFirst({
      where: { shop: store.shop, status: "authenticated", startAt: { gt: new Date() }, id: { not: store.billingId ?? "" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    enabled: billingConfigured(),
    currency: BILLING_CURRENCY,
    plans: PAID_PLANS.map((plan) => ({
      name: plan.name,
      label: plan.label,
      price: plan.monthlyPrice,
      credits: plan.credits,
      featured: Boolean(plan.featured),
    })),
    current: current
      ? {
          plan: current.plan,
          label: getPlan(current.plan).label,
          status: current.status,
          renewsOrEndsAt: current.currentEnd?.toISOString() ?? null,
          cancelAtCycleEnd: current.cancelAtCycleEnd,
          paymentIssue: current.status === "pending" || current.status === "halted",
        }
      : null,
    scheduled: scheduled
      ? { plan: scheduled.plan, label: getPlan(scheduled.plan).label, startsAt: scheduled.startAt?.toISOString() ?? null }
      : null,
  };
}

/**
 * Starts a checkout for a paid plan and returns the link to our hosted
 * checkout page. The subscription exists at Razorpay from here on, but nothing
 * changes for the store until it is paid.
 */
export async function createCheckout(store: ShopConfig, planName: unknown, returnUrl: unknown) {
  if (!billingConfigured() || !publicAppUrl()) {
    throw new WooAuthError(503, "Paid plans aren't available yet. Please try again later.", "billing_unavailable");
  }
  if (store.connectionStatus !== "connected") {
    throw new WooAuthError(403, "Connect your store before choosing a plan.", "not_connected");
  }
  const plan = PAID_PLANS.find((candidate) => candidate.name === planName);
  if (!plan) throw new WooAuthError(400, "Unknown plan", "bad_input");

  let back: URL;
  try {
    back = new URL(String(returnUrl));
  } catch {
    throw new WooAuthError(400, "Invalid return address", "bad_input");
  }
  // The merchant is sent here after paying, so it must be their own site —
  // otherwise this would be an open redirect under our domain.
  if (!originMatchesStore(back.origin, store.siteUrl)) {
    throw new WooAuthError(400, "The return address must be on your store's own site", "bad_input");
  }

  const current = store.billingId ? await db.billingSubscription.findUnique({ where: { id: store.billingId } }) : null;
  const currentPlan = current ? getPlan(current.plan) : null;
  const periodEnd = current?.currentEnd && current.currentEnd > new Date() ? current.currentEnd : null;

  if (current && currentPlan?.name === plan.name && !current.cancelAtCycleEnd) {
    throw new WooAuthError(409, `You're already on the ${plan.label} plan.`, "same_plan");
  }

  // Cheaper plans, and re-choosing a plan that is set to end, start when the
  // paid period ends. Everything else starts now.
  const startAt =
    periodEnd && currentPlan && (plan.monthlyPrice < currentPlan.monthlyPrice || plan.name === currentPlan.name)
      ? periodEnd
      : null;

  // Only one plan change can be pending: a new choice replaces an earlier
  // scheduled one, or it would start on top of this one.
  const superseded = await db.billingSubscription.findMany({
    where: { shop: store.shop, status: "authenticated", startAt: { gt: new Date() } },
  });
  for (const row of superseded) await cancelAtRazorpay(row, false);

  const { providerPlanId, amount } = await providerPlanFor(plan);
  const subscription = await razorpay<RazorpaySubscription>("POST", "/subscriptions", {
    plan_id: providerPlanId,
    total_count: TOTAL_MONTHLY_CHARGES,
    customer_notify: true,
    ...(startAt ? { start_at: Math.floor(startAt.getTime() / 1000) } : {}),
    expire_by: Math.floor((Date.now() + CHECKOUT_TTL_MS) / 1000),
    notes: { clothsy_store: store.shop, clothsy_plan: plan.name },
  });

  const checkoutToken = randomBytes(24).toString("base64url");
  await db.billingSubscription.create({
    data: {
      id: subscription.id,
      shop: store.shop,
      plan: plan.name,
      interval: "monthly",
      providerPlanId,
      amount,
      currency: BILLING_CURRENCY,
      status: subscription.status,
      checkoutToken,
      returnUrl: back.toString(),
      startAt,
    },
  });

  console.log(`[Billing] Checkout ${subscription.id} for ${store.shop}: ${plan.name}${startAt ? ` from ${startAt.toISOString()}` : ""}`);
  return { checkoutUrl: `${publicAppUrl()}/billing/woo/checkout/${checkoutToken}`, startsAt: startAt?.toISOString() ?? null };
}

/**
 * Cancels the store's paid plan at the end of the paid period, and any plan
 * change still waiting to start. Also run on disconnect, so a merchant who
 * removes the plugin is never charged again.
 */
export async function cancelPlan(store: ShopConfig, options: { disconnecting?: boolean } = {}) {
  const candidates = await db.billingSubscription.findMany({
    where: { shop: store.shop, status: { in: [...CANCELLABLE] } },
  });
  for (const candidate of candidates) {
    // Decide on Razorpay's current status, not ours: a webhook may not have
    // arrived yet (a plan paid a minute ago still reads "created" here).
    const row = await refreshRow(candidate.id);
    if (!row || !CANCELLABLE.has(row.status)) continue;

    const isCurrent = row.id === store.billingId;
    if (isCurrent) {
      if (row.cancelAtCycleEnd) continue;
      if (row.status !== "active" && row.status !== "pending") {
        // Paid, but Razorpay hasn't started the billing cycle yet, so it
        // can't be set to end with it. Cancelling outright would throw away
        // the month just paid for — unless the store is leaving, where
        // stopping future charges matters more.
        if (options.disconnecting) {
          await cancelAtRazorpay(row, false);
          continue;
        }
        throw new WooAuthError(409, "Your payment is still being processed. Please try cancelling again in a few minutes.", "billing_pending");
      }
      await cancelAtRazorpay(row, true);
      continue;
    }
    // Unpaid checkouts just lapse (Razorpay won't cancel one that was never
    // authorised, and they expire within a day). Scheduled changes go now.
    if (row.status === "created") continue;
    await cancelAtRazorpay(row, false);
  }
}

// ─── Mirroring Razorpay into the store ──────────────────────────────────────

/**
 * Re-reads one subscription from Razorpay and applies it. Returns null for
 * subscriptions we didn't create (the Razorpay account may bill other things).
 */
export async function syncSubscription(id: string) {
  const updated = await refreshRow(id);
  if (updated) await applyToStore(updated);
  return updated;
}

/** Copies Razorpay's current view of one of our subscriptions into its row. */
async function refreshRow(id: string) {
  const row = await db.billingSubscription.findUnique({ where: { id } });
  if (!row) return null;

  const subscription = await razorpay<RazorpaySubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
  return db.billingSubscription.update({
    where: { id },
    data: {
      status: subscription.status,
      currentStart: toDate(subscription.current_start),
      currentEnd: toDate(subscription.current_end),
      endedAt: toDate(subscription.ended_at),
    },
  });
}

async function applyToStore(row: BillingSubscription) {
  const store = await db.shopConfig.findUnique({ where: { shop: row.shop } });
  if (!store) return;

  const now = new Date();
  const startsLater = Boolean(row.startAt && row.startAt > now);
  const paid =
    row.status === "active" ||
    (Boolean(row.paymentVerifiedAt) && !startsLater && (row.status === "created" || row.status === "authenticated"));

  if (paid) {
    // Safety net: a disconnected store must not keep renewing. Disconnecting
    // cancels the plan, but if Razorpay was unreachable at that moment, the
    // next event for the subscription (at the latest, its renewal) ends it.
    if (store.connectionStatus === "disconnected" && row.status === "active" && !row.cancelAtCycleEnd) {
      await cancelAtRazorpay(row, true).catch(() => {});
    }
    if (store.billingId !== row.id) {
      await activate(store, row);
    } else if (row.currentStart && store.billingCycleStart.getTime() < row.currentStart.getTime() - RENEWAL_TOLERANCE_MS) {
      // A renewal. The lazy 30-day roll in tryon.server.ts may already have
      // reset the allowance a day or so earlier; the tolerance keeps the two
      // from granting it twice.
      await db.shopConfig.update({
        where: { shop: store.shop },
        data: { creditsUsed: 0, overageReserved: 0, billingCycleStart: row.currentStart },
      });
    }
    return;
  }

  // A scheduled downgrade is authorised: end the current plan when its period
  // does, which is exactly when this one starts.
  if (row.status === "authenticated" && startsLater && store.billingId && store.billingId !== row.id) {
    const current = await db.billingSubscription.findUnique({ where: { id: store.billingId } });
    if (current && current.status === "active" && !current.cancelAtCycleEnd) {
      await cancelAtRazorpay(current, true);
    }
    return;
  }

  // Failed renewal still being retried ("pending") keeps the plan meanwhile.
  if (ENDED.has(row.status)) {
    const free = getPlan("free");
    const { count } = await db.shopConfig.updateMany({
      where: { shop: store.shop, billingId: row.id },
      // No refill on the way down — see isBillingCycleDue in billing.server.ts.
      data: { plan: free.name, billingId: null, monthlyCredits: free.credits },
    });
    if (count > 0) console.log(`[Billing] ${store.shop} returned to ${free.label} (${row.id} ${row.status})`);
  }
}

async function activate(store: ShopConfig, row: BillingSubscription) {
  const plan = getPlan(row.plan);
  const previousId = store.billingId;

  // Conditional on the subscription not being active yet, so a webhook and a
  // checkout return racing each other activate (and reset) only once.
  const { count } = await db.shopConfig.updateMany({
    where: { shop: store.shop, OR: [{ billingId: null }, { billingId: { not: row.id } }] },
    data: {
      plan: plan.name,
      billingId: row.id,
      monthlyCredits: plan.credits,
      // A new paid plan is a new paid period with a full allowance.
      creditsUsed: 0,
      overageReserved: 0,
      billingCycleStart: row.currentStart ?? new Date(),
      isEnabled: true,
      ...(store.isSuspended && store.suspendReason?.startsWith(BILLING_SUSPEND_PREFIX)
        ? { isSuspended: false, suspendReason: null }
        : {}),
    },
  });
  if (count === 0) return;
  console.log(`[Billing] ${store.shop} is now on ${plan.label} (${row.id})`);

  if (previousId) {
    const previous = await db.billingSubscription.findUnique({ where: { id: previousId } });
    if (previous && CANCELLABLE.has(previous.status)) {
      await cancelAtRazorpay(previous, false).catch(() => {
        // Logged inside; the new plan is live either way.
      });
    }
  }
}

/**
 * Safety net for missed webhooks, run when the merchant opens the plugin:
 * re-sync a current subscription whose period has ended, and any scheduled one
 * that should have started.
 */
export async function refreshStaleSubscriptions(store: ShopConfig) {
  if (!billingConfigured()) return;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await db.billingSubscription.findMany({
    where: {
      shop: store.shop,
      OR: [
        { id: store.billingId ?? "", currentEnd: { lt: hourAgo } },
        { status: "authenticated", startAt: { lt: hourAgo } },
      ],
    },
    take: 3,
  });
  for (const row of stale) {
    await syncSubscription(row.id).catch((error) => console.warn(`[Billing] Refresh of ${row.id} failed:`, error));
  }
}

// ─── Signatures ────────────────────────────────────────────────────────────

/** Razorpay's checkout signature for a subscription payment. */
export function checkoutSignatureValid(paymentId: string, subscriptionId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !paymentId || !signature) return false;
  return safeEqual(hmacHex(secret, `${paymentId}|${subscriptionId}`), signature);
}

/** Razorpay's webhook signature: HMAC-SHA256 of the raw body. */
export function webhookSignatureValid(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmacHex(secret, rawBody), signature);
}
