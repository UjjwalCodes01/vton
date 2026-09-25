// Atomic credit and overage reservation for try-on generations.
//
// The problem this solves: a try-on takes tens of seconds, and its cost is only
// recorded when it finishes. Checking "credits remaining > 0" and then starting
// the generation is a read-then-write across that whole window, so N concurrent
// shoppers all read the same balance, all pass the check, and all complete —
// past the plan allowance, and past the usage cap the merchant approved. On a
// Basic store with 10 credits that is invisible; on a store whose cap is the
// only thing standing between us and an unbillable provider invoice, it is not.
//
// So a generation reserves its slot BEFORE any provider work starts, in a single
// conditional UPDATE whose WHERE clause is the limit itself. Postgres takes a row
// lock per statement, so the (N+1)th concurrent reservation matches zero rows and
// is refused. The reservation is released if the generation fails, and settled
// (billed, for overage) when it succeeds.
//
// Invariant: ShopConfig.creditsUsed counts credits CONSUMED OR RESERVED, and
// every TryOnEvent with status "pending" holds exactly one of them plus
// `overageAmount` USD of ShopConfig.overageReserved.

import db from "./db.server";
import { chargeOverage, getOverageAvailability, getPlan } from "./billing.server";

/**
 * How long a pending generation may hold its reservation.
 *
 * The widget polls for at most 3 minutes, and a shopper who closes the tab never
 * polls at all, so without a sweep those holds would leak credits permanently.
 * Generous enough that a slow-but-live provider task is never reclaimed early.
 */
export const RESERVATION_TTL_MS = 15 * 60 * 1000;

/**
 * What a store may spend this cycle: the plan's allowance plus anything bought
 * on top of it.
 *
 * Every screen that shows "x of y used" must use this, or a merchant who has
 * just paid an invoice sees their old ceiling and thinks the payment failed.
 */
export function allowanceFor(config: { monthlyCredits: number; cycleTopUpCredits: number }) {
  return config.monthlyCredits + config.cycleTopUpCredits;
}

export type Reservation =
  | { ok: true; overageAmount: number; billedAs: "allowance" | "overage" }
  | { ok: false; reason: string };

/**
 * Releases the credit (and any overage hold) belonging to one settled-as-failed
 * generation.
 *
 * GREATEST clamps at zero because a billing-cycle rollover can zero creditsUsed
 * while generations are still in flight; releasing those holds afterwards must
 * not push the counters negative.
 */
export async function releaseReservation(shop: string, overageAmount: number) {
  await db.$executeRaw`
    UPDATE "ShopConfig"
    SET "creditsUsed" = GREATEST("creditsUsed" - 1, 0),
        "overageReserved" = GREATEST("overageReserved" - ${overageAmount}::double precision, 0)
    WHERE "shop" = ${shop}
  `;
}

/** Moves an overage hold into the billed total once Shopify has accepted the charge. */
async function commitOverage(shop: string, reserved: number, charged: number) {
  await db.$executeRaw`
    UPDATE "ShopConfig"
    SET "overageReserved" = GREATEST("overageReserved" - ${reserved}::double precision, 0),
        "overageChargesTotal" = "overageChargesTotal" + ${charged}::double precision
    WHERE "shop" = ${shop}
  `;
}

/**
 * Reserves one credit for a generation that is about to start.
 *
 * Tries the plan allowance first. Once that is spent, a try-on may only proceed
 * if Shopify can actually bill for it: the subscription must carry a usage-charge
 * meter with headroom under the merchant-approved cap, and the headroom must
 * cover this charge *plus everything already reserved by in-flight generations*.
 * That last clause is the whole point — `remainingCap` from Shopify lags by the
 * generations that have not been billed yet.
 */
export async function reserveTryOnCredit(params: {
  shop: string;
  plan: string;
  requestId: string;
}): Promise<Reservation> {
  const { shop, requestId } = params;

  // ── Inside the allowance ──
  // The allowance is the plan's own credits plus any bought for this cycle
  // through an invoice. Both are compared in one atomic statement so a top-up
  // landing mid-generation can never be double-spent.
  const withinAllowance = await db.$executeRaw`
    UPDATE "ShopConfig"
    SET "creditsUsed" = "creditsUsed" + 1
    WHERE "shop" = ${shop}
      AND "creditsUsed" < "monthlyCredits" + "cycleTopUpCredits"
  `;

  if (withinAllowance > 0) {
    return { ok: true, overageAmount: 0, billedAs: "allowance" };
  }

  // ── Past the allowance: only proceed if it is billable ──
  const plan = getPlan(params.plan);
  if (plan.overagePrice <= 0) {
    return { ok: false, reason: "Plan has no overage pricing" };
  }

  const availability = await getOverageAvailability(shop);
  if (!availability.available) {
    return { ok: false, reason: availability.reason ?? "Overage unavailable" };
  }

  const price = plan.overagePrice;
  const reserved = await db.$executeRaw`
    UPDATE "ShopConfig"
    SET "creditsUsed" = "creditsUsed" + 1,
        "overageReserved" = "overageReserved" + ${price}::double precision
    WHERE "shop" = ${shop}
      AND "creditsUsed" >= "monthlyCredits" + "cycleTopUpCredits"
      AND "overageReserved" + ${price}::double precision <= ${availability.remainingCap}::double precision
  `;

  if (reserved === 0) {
    // Either another concurrent generation just took the last of the approved
    // cap, or the cycle rolled underneath us. Retry the allowance path once;
    // anything else is a genuine refusal.
    const afterRoll = await db.$executeRaw`
      UPDATE "ShopConfig"
      SET "creditsUsed" = "creditsUsed" + 1
      WHERE "shop" = ${shop}
        AND "creditsUsed" < "monthlyCredits" + "cycleTopUpCredits"
    `;
    if (afterRoll > 0) {
      return { ok: true, overageAmount: 0, billedAs: "allowance" };
    }
    return {
      ok: false,
      reason: "Merchant-approved spending cap fully reserved for this cycle",
    };
  }

  console.log(
    `[Credits][${requestId}] ${shop} reserved an overage try-on at $${price.toFixed(2)} ` +
      `($${availability.remainingCap.toFixed(2)} cap headroom before this reservation)`
  );

  return { ok: true, overageAmount: price, billedAs: "overage" };
}

/**
 * Settles a generation that completed successfully: the credit stays spent, and
 * an overage hold turns into an actual Shopify usage record.
 *
 * Never throws. A billing failure must not turn a delivered try-on into an error
 * for the shopper, but it does release the hold so the cap stays accurate.
 */
export async function settleSuccessfulReservation(params: {
  shop: string;
  overageAmount: number;
  generationId: string;
}): Promise<void> {
  const { shop, overageAmount, generationId } = params;
  if (overageAmount <= 0) return;

  const result = await chargeOverage({
    shop,
    amount: overageAmount,
    description: `Try-on beyond monthly allowance (${generationId})`,
  });

  if (!result.charged) {
    console.warn(
      `[Billing] Overage not charged for ${shop} (${generationId}): ${result.reason ?? "unknown"}`
    );
  }

  await commitOverage(shop, overageAmount, result.charged ? overageAmount : 0);
}

/** Generations currently holding a reservation for this shop. */
export async function countInFlightGenerations(shop: string): Promise<number> {
  return db.tryOnEvent.count({
    where: {
      shop,
      status: "pending",
      createdAt: { gte: new Date(Date.now() - RESERVATION_TTL_MS) },
    },
  });
}

/**
 * Fails out pending generations that will never be polled and gives their
 * credits back.
 *
 * Runs on the request path (cheap: one indexed query on [shop, status]) so
 * abandoned try-ons cannot slowly starve a shop of its allowance.
 */
export async function reclaimStaleReservations(shop: string): Promise<number> {
  const cutoff = new Date(Date.now() - RESERVATION_TTL_MS);

  const stale = await db.tryOnEvent.findMany({
    where: { shop, status: "pending", createdAt: { lt: cutoff } },
    select: { id: true, overageAmount: true },
    take: 100,
  });

  let reclaimed = 0;
  for (const event of stale) {
    // updateMany on the pending status is the idempotency guard: whoever flips it
    // first is the only caller that releases the hold.
    const { count } = await db.tryOnEvent.updateMany({
      where: { id: event.id, status: "pending" },
      data: {
        status: "failed",
        errorCode: "abandoned",
        errorMessage: "Generation was never completed; reservation reclaimed.",
      },
    });

    if (count > 0) {
      await releaseReservation(shop, event.overageAmount);
      reclaimed += 1;
    }
  }

  if (reclaimed > 0) {
    console.log(`[Credits] Reclaimed ${reclaimed} stale reservation(s) for ${shop}`);
  }

  return reclaimed;
}
