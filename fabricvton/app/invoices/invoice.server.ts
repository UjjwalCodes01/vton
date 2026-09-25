// Selling credits outside the app stores.
//
// The shape of a deal here is: an admin agrees a price with a merchant, drafts
// an invoice, sends it, and the merchant pays it in their own portal with
// Razorpay. Paying grants the credits.
//
// Two rules hold the whole thing together:
//
//   1. Only a `sent` invoice can be paid. A draft is a working document and can
//      be edited or thrown away; nothing chargeable exists until it is sent.
//   2. Credits are granted exactly once, guarded by `creditsAppliedAt` inside a
//      conditional update. The browser coming back from Razorpay and the
//      webhook arriving from Razorpay both call the same function, usually
//      within a second of each other, and only one of them can win.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CreditInvoice } from "@prisma/client";
import db from "../db.server";

export class InvoiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

export function formatMoney(amount: number, currency: string) {
  return `${SYMBOL[currency] ?? ""}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || "";
}

// ─── Razorpay ──────────────────────────────────────────────────────────────

const API_BASE = process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com";

async function razorpay<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${API_BASE}/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
  if (!response.ok) {
    throw new InvoiceError(502, json.error?.description || `Razorpay request failed (${response.status}).`);
  }
  return json as T;
}

/** Razorpay works in the currency's smallest unit: paise, or cents. */
const minorUnits = (amount: number) => Math.round(amount * 100);

// ─── Drafting and sending ──────────────────────────────────────────────────

export async function createInvoice(params: {
  shop: string;
  credits: number;
  amount: number;
  currency: string;
  description?: string | null;
  internalNote?: string | null;
  createdBy: string;
  send?: boolean;
}) {
  const store = await db.shopConfig.findUnique({ where: { shop: params.shop } });
  if (!store) throw new InvoiceError(404, "No such store.");

  const credits = Math.round(Number(params.credits));
  const amount = Number(params.amount);
  const currency = String(params.currency || "INR").toUpperCase();

  if (!Number.isFinite(credits) || credits <= 0 || credits > 1_000_000) {
    throw new InvoiceError(400, "Credits must be between 1 and 1,000,000.");
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    throw new InvoiceError(400, "Enter an amount greater than zero.");
  }
  if (!CURRENCIES.includes(currency as Currency)) {
    throw new InvoiceError(400, "Currency must be INR or USD.");
  }

  return db.creditInvoice.create({
    data: {
      id: `inv_${randomBytes(9).toString("base64url")}`,
      shop: params.shop,
      credits,
      amount,
      currency,
      description: params.description?.trim()?.slice(0, 300) || null,
      internalNote: params.internalNote?.trim()?.slice(0, 300) || null,
      createdBy: params.createdBy,
      status: params.send ? "sent" : "draft",
      sentAt: params.send ? new Date() : null,
    },
  });
}

export async function sendInvoice(id: string) {
  const { count } = await db.creditInvoice.updateMany({
    where: { id, status: "draft" },
    data: { status: "sent", sentAt: new Date() },
  });
  if (count === 0) throw new InvoiceError(409, "Only a draft can be sent.");
  return db.creditInvoice.findUniqueOrThrow({ where: { id } });
}

export async function cancelInvoice(id: string) {
  const { count } = await db.creditInvoice.updateMany({
    where: { id, status: { in: ["draft", "sent"] } },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  if (count === 0) throw new InvoiceError(409, "A paid invoice cannot be cancelled.");
  return db.creditInvoice.findUniqueOrThrow({ where: { id } });
}

// ─── Paying ────────────────────────────────────────────────────────────────

/**
 * Makes (or reuses) the Razorpay order the merchant's checkout will open.
 *
 * Reused rather than recreated: a merchant who closes the payment sheet and
 * tries again should land on the same order, so Razorpay's own dashboard shows
 * one attempt per invoice instead of a pile of abandoned ones.
 */
export async function orderForInvoice(invoice: CreditInvoice) {
  if (!razorpayConfigured()) throw new InvoiceError(503, "Payments are not available right now.");
  if (invoice.status === "paid") throw new InvoiceError(409, "This invoice is already paid.");
  if (invoice.status !== "sent") throw new InvoiceError(409, "This invoice is not payable.");

  if (invoice.razorpayOrderId) {
    const existing = await razorpay<{ id: string; status: string }>(
      "GET",
      `/orders/${encodeURIComponent(invoice.razorpayOrderId)}`,
    ).catch(() => null);
    if (existing && existing.status !== "paid") return { orderId: existing.id };
  }

  const order = await razorpay<{ id: string }>("POST", "/orders", {
    amount: minorUnits(invoice.amount),
    currency: invoice.currency,
    receipt: invoice.id,
    notes: { shop: invoice.shop, credits: String(invoice.credits), invoice: invoice.id },
  });

  await db.creditInvoice.update({ where: { id: invoice.id }, data: { razorpayOrderId: order.id } });
  return { orderId: order.id };
}

/** Razorpay signs `order_id|payment_id` with the key secret on checkout return. */
export function checkoutSignatureValid(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Grants an invoice's credits, once.
 *
 * The conditional update is the lock: whichever of the checkout return and the
 * webhook gets there first flips `creditsAppliedAt` and tops the store up, and
 * the other finds nothing to update and simply reports success. Both run
 * against a payment Razorpay has already confirmed, so the only question is
 * which one arrives first, never whether it was really paid.
 */
export async function applyPaidInvoice(invoiceId: string, paymentId: string) {
  const { count } = await db.creditInvoice.updateMany({
    where: { id: invoiceId, status: { in: ["sent", "paid"] }, creditsAppliedAt: null },
    data: {
      status: "paid",
      paidAt: new Date(),
      creditsAppliedAt: new Date(),
      razorpayPaymentId: paymentId.slice(0, 80),
    },
  });

  const invoice = await db.creditInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (count === 0) return { invoice, granted: false };

  await db.shopConfig.update({
    where: { shop: invoice.shop },
    data: { cycleTopUpCredits: { increment: invoice.credits } },
  });

  console.log(
    `[Invoice] ${invoice.shop} paid ${invoice.id} (${formatMoney(invoice.amount, invoice.currency)}) ` +
      `→ +${invoice.credits} credits this cycle`,
  );
  return { invoice, granted: true };
}

/**
 * Confirms a payment with Razorpay before granting anything.
 *
 * Used by the webhook, where the event body is only a prompt to go and look.
 */
export async function confirmAndApply(orderId: string, paymentId: string) {
  const invoice = await db.creditInvoice.findFirst({ where: { razorpayOrderId: orderId } });
  if (!invoice) return null;

  const order = await razorpay<{ status: string }>("GET", `/orders/${encodeURIComponent(orderId)}`);
  if (order.status !== "paid") return { invoice, granted: false };

  return applyPaidInvoice(invoice.id, paymentId);
}

// ─── Reading ───────────────────────────────────────────────────────────────

/** What the merchant may see: never drafts, never internal notes. */
export async function invoicesForMerchant(shop: string) {
  const rows = await db.creditInvoice.findMany({
    where: { shop, status: { in: ["sent", "paid"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    credits: row.credits,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    description: row.description,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
  }));
}

export async function invoicesForAdmin(shop?: string) {
  return db.creditInvoice.findMany({
    where: shop ? { shop } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
