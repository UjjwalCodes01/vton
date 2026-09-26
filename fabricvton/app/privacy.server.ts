// GDPR / CCPA customer data requests.
//
// Shopify's customers/data_request webhook is a 30-day clock, not a notification:
// the merchant is legally obliged to hand the shopper everything we hold about
// them, and "we only log it" is not a workflow. We do store personal data — lead
// emails, the products they tried on, and the try-on history tied to that email —
// so there is something to hand over.
//
// This module compiles that data into a snapshot at receipt time (before any
// later redaction can empty it), records the request so the merchant can see it
// and mark it delivered, and leaves an audit trail of who delivered it and when.
// The merchant-facing half lives in app/routes/app.privacy.tsx.

import db from "./db.server";
import { deleteSharedLooks } from "./share/share.server";
import { RETENTION } from "./retention.server";

export interface CustomerDataExport {
  generatedAt: string;
  shop: string;
  subject: {
    /** Shopify only: WooCommerce requests identify the shopper by email. */
    shopifyCustomerId?: string | null;
    email: string | null;
  };
  /**
   * What we hold, and what we deliberately do not — the negative statement is
   * part of a complete answer to a subject access request.
   */
  dataWeDoNotHold: string[];
  retentionPolicy: Record<string, string>;
  processors: Array<{ name: string; purpose: string; dataShared: string }>;
  leads: Array<{
    email: string;
    productId: string | null;
    productTitle: string | null;
    source: string;
    capturedAt: string;
    /** Which consent wording was agreed to in the widget, and when. */
    consentGivenAt: string | null;
    consentVersion: string | null;
  }>;
  tryOns: Array<{
    productId: string | null;
    productTitle: string | null;
    status: string;
    occurredAt: string;
  }>;
}

const AI_PROCESSOR = {
  name: "AI image-processing provider",
  purpose: "Generating the virtual try-on image",
  dataShared:
    "The photo the shopper uploaded and the public product image URL. Processed transiently; not used to train models.",
};
const HOSTING_PROCESSOR = {
  name: "Cloud hosting provider",
  purpose: "Running the app's servers and database",
  dataShared: "The lead and try-on records listed in this export. No shopper photos.",
};
const SHOPIFY_PROCESSOR = {
  name: "Shopify",
  purpose: "Store platform, authentication and billing",
  dataShared: "Shop identity and subscription state. No shopper photos.",
};

// WooCommerce stores are billed by our payment processor, which only ever sees
// the merchant — no shopper data reaches it, so it is not a processor here.
const PROCESSORS = {
  shopify: [AI_PROCESSOR, SHOPIFY_PROCESSOR, HOSTING_PROCESSOR],
  woocommerce: [AI_PROCESSOR, HOSTING_PROCESSOR],
};

function retentionSummary(platform: "shopify" | "woocommerce"): Record<string, string> {
  return {
    "Uploaded photos and generated images":
      "Never stored by Clothsy AI. Streamed to the try-on provider and discarded.",
    "Lead email addresses":
      platform === "woocommerce"
        ? `Held until the shopper's data is erased at the store's request, or ${RETENTION.wooDisconnectedStoreDays} days after the store disconnects from Clothsy AI.`
        : "Held until the merchant deletes them, the customer is redacted, or the shop is uninstalled and redacted.",
    "Try-on history":
      `Email removed after ${RETENTION.tryOnEventEmailDays} days; the anonymous event record deleted after ${RETENTION.tryOnEventDays} days.`,
    "Aggregate daily analytics":
      `Counts only, no personal data, deleted after ${RETENTION.analyticsDailyDays} days.`,
  };
}

/**
 * Gathers everything we hold for one shopper of one shop.
 *
 * Matching is by email because that is the only shopper identifier the widget
 * ever collects — we never see a Shopify customer id at try-on time, so the id
 * from the webhook is recorded for the merchant's reference but cannot be joined
 * on.
 */
export async function compileCustomerDataExport(params: {
  shop: string;
  email: string | null;
  customerId: string | null;
  platform?: "shopify" | "woocommerce";
}): Promise<CustomerDataExport> {
  const { shop, email, customerId } = params;

  const [leads, tryOns] = email
    ? await Promise.all([
        db.lead.findMany({
          where: { shop, email },
          orderBy: { createdAt: "desc" },
        }),
        db.tryOnEvent.findMany({
          where: { shop, leadEmail: email },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return {
    generatedAt: new Date().toISOString(),
    shop,
    subject: params.platform === "woocommerce" ? { email } : { shopifyCustomerId: customerId, email },
    dataWeDoNotHold: [
      "The photo the shopper uploaded (never written to storage)",
      "The generated try-on image (served from the provider, never stored by us)",
      "Payment details, addresses, or order contents",
      "Any biometric template or face embedding",
    ],
    retentionPolicy: retentionSummary(params.platform ?? "shopify"),
    processors: PROCESSORS[params.platform ?? "shopify"],
    leads: leads.map((lead) => ({
      email: lead.email,
      productId: lead.productId,
      productTitle: lead.productTitle,
      source: lead.source,
      capturedAt: lead.createdAt.toISOString(),
      consentGivenAt: lead.consentAt?.toISOString() ?? null,
      consentVersion: lead.consentVersion,
    })),
    tryOns: tryOns.map((event) => ({
      productId: event.productId,
      productTitle: event.productTitle,
      status: event.status,
      occurredAt: event.createdAt.toISOString(),
    })),
  };
}

/**
 * Records an incoming data request together with its compiled snapshot.
 *
 * The snapshot is taken now rather than when the merchant opens the page because
 * a customers/redact for the same shopper may well arrive first — and then a
 * lazily-built export would truthfully but uselessly report nothing, while the
 * merchant still owes an answer.
 */
export async function recordCustomerDataRequest(params: {
  shop: string;
  email: string | null;
  customerId: string | null;
  orderIds: unknown;
}) {
  const exportPayload = await compileCustomerDataExport({
    shop: params.shop,
    email: params.email,
    customerId: params.customerId,
  });

  const recordCount = exportPayload.leads.length + exportPayload.tryOns.length;

  return db.privacyRequest.create({
    data: {
      shop: params.shop,
      type: "customer_data_request",
      customerId: params.customerId,
      customerEmail: params.email,
      orderIds: Array.isArray(params.orderIds)
        ? JSON.stringify(params.orderIds.slice(0, 250))
        : null,
      // "no_data" is a real outcome, not a failure: the merchant still has to
      // respond, and a request with nothing behind it needs a different reply
      // from one with records attached.
      status: recordCount > 0 ? "pending" : "no_data",
      recordCount,
      exportJson: JSON.stringify(exportPayload, null, 2),
    },
  });
}

/**
 * Erases one shopper's personal data for one shop: Shopify's customers/redact
 * webhook and the WooCommerce "Erase Personal Data" tool both land here.
 *
 * `email` must already be lowercased — the try-on endpoint stores it that way,
 * so matching anything else quietly deletes nothing.
 */
export async function eraseCustomerData(shop: string, email: string) {
  const leads = await db.lead.deleteMany({ where: { shop, email } });

  // Keep the try-on rows so analytics stay correct, but cut every route back to
  // the person's image: the shared looks go, and without the task id neither
  // the image proxy nor the merchant portal can fetch the result again.
  const theirs = await db.tryOnEvent.findMany({
    where: { shop, leadEmail: email },
    select: { id: true, providerTaskId: true },
  });
  const generationIds = theirs.flatMap((row) => (row.providerTaskId ? [row.id, row.providerTaskId] : [row.id]));
  const looksDeleted = generationIds.length ? await deleteSharedLooks({ shop, generationIds }) : 0;

  const tryOns = await db.tryOnEvent.updateMany({
    where: { shop, leadEmail: email },
    data: { leadEmail: null, providerTaskId: null },
  });

  // A stored data-request export is a copy of exactly the data being erased,
  // so it has to go too. The audit record stays — proof that a request was
  // handled is not personal data we were asked to erase — but its payload is
  // dropped and it is marked so the merchant knows why it is now empty.
  await db.privacyRequest.updateMany({
    where: { shop, customerEmail: email },
    data: {
      exportJson: null,
      recordCount: 0,
      note: "Export payload erased following a customer erasure request.",
    },
  });

  return { leadsDeleted: leads.count, tryOnsAnonymized: tryOns.count, looksDeleted };
}

/** Closes out a request once the merchant has sent the data to the shopper. */
export async function markDataRequestDelivered(params: {
  shop: string;
  id: string;
  deliveredTo: string | null;
  deliveredBy: string | null;
  note: string | null;
}) {
  // Scoped by shop as well as id so one merchant can never close another's
  // request by guessing an id.
  const { count } = await db.privacyRequest.updateMany({
    where: { id: params.id, shop: params.shop, deliveredAt: null },
    data: {
      status: "delivered",
      deliveredAt: new Date(),
      deliveredTo: params.deliveredTo,
      deliveredBy: params.deliveredBy,
      note: params.note,
    },
  });

  return count > 0;
}
