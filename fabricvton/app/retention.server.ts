// Data retention.
//
// The privacy policy we publish is only true if something actually enforces it.
// These are the documented periods, in one place, with the code that applies
// them. Any change here must be reflected in the published shopper policy
// (fabricvton-nextjs/src/app/widget-privacy/page.tsx) and the merchant policy.
//
// What we hold, and for how long:
//
//   Shopper photos / generated images  Never stored by us. The photo is streamed
//                                      to the engine for processing and the result is
//                                      served from the engine's URL; neither is
//                                      written to our database or disk.
//   Lead emails (Lead)                 Held until the merchant deletes them, the
//                                      shop is redacted, or a customers/redact
//                                      webhook arrives. This is merchant CRM data
//                                      the merchant owns — a fixed expiry would
//                                      silently destroy their records.
//   Try-on event metadata (TryOnEvent) 13 months, then deleted. Long enough for
//                                      year-over-year reporting, short enough not
//                                      to be an indefinite behavioural log. Email
//                                      is nulled at 90 days, well before the row
//                                      goes, because the identifier is the
//                                      sensitive part, not the event.
//   Daily analytics (AnalyticsDaily)   25 months. Aggregate counts only, no
//                                      personal data.
//   Privacy requests (PrivacyRequest)  The compiled export payload is dropped 30
//                                      days after delivery (it is a copy of
//                                      personal data and should not outlive its
//                                      purpose); the audit record itself is kept
//                                      24 months as proof of handling.
//   Rate-limit counters                2 hours. See app/ratelimit.server.ts.
//   Disconnected WooCommerce stores    30 days after disconnecting, then the
//                                      store and its leads, try-on history and
//                                      analytics are deleted. Until then,
//                                      reconnecting from the same site restores
//                                      them (see api.woo.verify.tsx). The
//                                      WooCommerce counterpart of shop/redact.

import db from "./db.server";
import { purgeExpiredLooks } from "./share/share.server";

const DAY_MS = 24 * 60 * 60 * 1000;

export const RETENTION = {
  /** Try-on rows are deleted after this long. */
  tryOnEventDays: 396, // ~13 months
  /** Lead email is removed from try-on rows well before the rows themselves. */
  tryOnEventEmailDays: 90,
  /** Aggregate daily counters. */
  analyticsDailyDays: 760, // ~25 months
  /** How long a delivered export payload may sit in the database. */
  privacyExportPayloadDays: 30,
  /** How long the audit record of a privacy request is kept. */
  privacyRequestDays: 730, // 24 months
  /** How long a disconnected WooCommerce store's data waits for a reconnect. */
  wooDisconnectedStoreDays: 30,
  /** A shared look's page, and the stored image behind it. */
  sharedLookDays: 30,
} as const;

export interface PurgeSummary {
  tryOnEventsDeleted: number;
  tryOnEmailsCleared: number;
  analyticsDeleted: number;
  privacyPayloadsCleared: number;
  privacyRequestsDeleted: number;
  wooNoncesDeleted: number;
  wooPendingStoresDeleted: number;
  wooDisconnectedStoresDeleted: number;
  billingWebhookEventsDeleted: number;
  sharedLooksDeleted: number;
}

function cutoff(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}

/**
 * Applies every retention period above.
 *
 * Invoked opportunistically from the try-on request path (at most once a day
 * across all instances — see shouldRunPeriodically) because the app has no
 * scheduler. It is also safe to call by hand.
 */
export async function purgeExpiredData(): Promise<PurgeSummary> {
  const summary: PurgeSummary = {
    tryOnEventsDeleted: 0,
    tryOnEmailsCleared: 0,
    analyticsDeleted: 0,
    privacyPayloadsCleared: 0,
    privacyRequestsDeleted: 0,
    wooNoncesDeleted: 0,
    wooPendingStoresDeleted: 0,
    wooDisconnectedStoresDeleted: 0,
    billingWebhookEventsDeleted: 0,
    sharedLooksDeleted: 0,
  };

  // Drop the identifier from older try-on rows but keep the row, so analytics
  // stay correct while the personal data goes.
  summary.tryOnEmailsCleared = (
    await db.tryOnEvent.updateMany({
      where: {
        createdAt: { lt: cutoff(RETENTION.tryOnEventEmailDays) },
        leadEmail: { not: null },
      },
      data: { leadEmail: null },
    })
  ).count;

  summary.tryOnEventsDeleted = (
    await db.tryOnEvent.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION.tryOnEventDays) } },
    })
  ).count;

  summary.analyticsDeleted = (
    await db.analyticsDaily.deleteMany({
      where: { date: { lt: cutoff(RETENTION.analyticsDailyDays) } },
    })
  ).count;

  // A delivered export has served its purpose; the audit trail does not need the
  // personal data, only the record that it was handled.
  summary.privacyPayloadsCleared = (
    await db.privacyRequest.updateMany({
      where: {
        deliveredAt: { lt: cutoff(RETENTION.privacyExportPayloadDays) },
        exportJson: { not: null },
      },
      data: { exportJson: null },
    })
  ).count;

  summary.privacyRequestsDeleted = (
    await db.privacyRequest.deleteMany({
      where: { requestedAt: { lt: cutoff(RETENTION.privacyRequestDays) } },
    })
  ).count;

  // Replay protection only needs a nonce for as long as its request's
  // timestamp is still accepted (5 minutes); 15 leaves margin for clock skew.
  summary.wooNoncesDeleted = (
    await db.wooRequestNonce.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
    })
  ).count;

  // WooCommerce registrations that never proved control of their URL.
  // Connecting takes seconds, so a day-old pending store is abandoned or bogus.
  summary.wooPendingStoresDeleted = (
    await db.shopConfig.deleteMany({
      where: {
        platform: "woocommerce",
        connectionStatus: "pending",
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
  ).count;

  // Razorpay retries a webhook for at most 24 hours (support can replay up to
  // 15 days), so its delivery ids only need remembering for a while.
  summary.billingWebhookEventsDeleted = (
    await db.billingWebhookEvent.deleteMany({ where: { receivedAt: { lt: cutoff(30) } } })
  ).count;

  // Stores that disconnected and never came back. Everything keyed by the
  // store goes with it — this is the WooCommerce equivalent of shop/redact.
  const abandoned = await db.shopConfig.findMany({
    where: {
      platform: "woocommerce",
      connectionStatus: "disconnected",
      disconnectedAt: { lt: cutoff(RETENTION.wooDisconnectedStoreDays) },
    },
    select: { shop: true },
    take: 100,
  });
  for (const { shop } of abandoned) {
    await db.$transaction([
      db.lead.deleteMany({ where: { shop } }),
      db.tryOnEvent.deleteMany({ where: { shop } }),
      db.analyticsDaily.deleteMany({ where: { shop } }),
      db.privacyRequest.deleteMany({ where: { shop } }),
      db.shopConfig.deleteMany({ where: { shop, connectionStatus: "disconnected" } }),
    ]);
    summary.wooDisconnectedStoresDeleted += 1;
  }

  const touched = Object.values(summary).some((count) => count > 0);
  if (touched) {
    console.log("[Retention] Purge pass complete:", summary);
  }


  // Shared looks own an image in the bucket, so each one is removed through
  // the share module rather than a bulk delete that would orphan the file.
  summary.sharedLooksDeleted = (await purgeExpiredLooks()).deleted;

  return summary;
}
