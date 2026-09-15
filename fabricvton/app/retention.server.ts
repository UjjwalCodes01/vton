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
//                                      to YouCam for processing and the result is
//                                      served from YouCam's URL; neither is
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

import db from "./db.server";

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
} as const;

export interface PurgeSummary {
  tryOnEventsDeleted: number;
  tryOnEmailsCleared: number;
  analyticsDeleted: number;
  privacyPayloadsCleared: number;
  privacyRequestsDeleted: number;
  wooNoncesDeleted: number;
  wooPendingStoresDeleted: number;
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

  const touched = Object.values(summary).some((count) => count > 0);
  if (touched) {
    console.log("[Retention] Purge pass complete:", summary);
  }

  return summary;
}
