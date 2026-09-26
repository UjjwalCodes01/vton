import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { ownsStore, subjectFromSession } from "../invoices/subject.server";
import {
  confirmAndApply,
  checkoutSignatureValid,
  InvoiceError,
  orderForInvoice,
  razorpayKeyId,
} from "../invoices/invoice.server";
import { readJsonLimited } from "../bodylimit.server";

/**
 * Starting a payment, and finishing one.
 *
 * `start` opens (or reuses) a Razorpay order. `confirm` is the browser coming
 * back from the payment sheet: the signature it carries is checked against our
 * own key secret before a single credit is granted, so a merchant cannot mint
 * credits by calling this with made-up ids.
 *
 * Every lookup is scoped by the session's shop, so one merchant can neither see
 * nor pay another's invoice.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await readJsonLimited(request)) as Record<string, string>;
    const subject = await subjectFromSession(body.session);
    if (!subject) return adminJson({ error: "Session expired." }, 401);

    // Scoped to the stores this account manages, so one signed-in person can
    // neither see nor pay an invoice raised against somebody else's store.
    const invoice = await db.creditInvoice.findFirst({
      where: { id: String(body.invoiceId || ""), shop: { in: subject.stores.map((s) => s.shop) } },
    });
    if (!invoice || !ownsStore(subject, invoice.shop)) {
      return adminJson({ error: "No such invoice." }, 404);
    }
    const shop = invoice.shop;

    if (body.step === "start") {
      const { orderId } = await orderForInvoice(invoice);
      return adminJson({
        orderId,
        keyId: razorpayKeyId(),
        amount: Math.round(invoice.amount * 100),
        currency: invoice.currency,
        description: invoice.description || `${invoice.credits.toLocaleString("en-US")} try-on credits`,
      });
    }

    if (body.step === "confirm") {
      const orderId = String(body.razorpay_order_id || "");
      const paymentId = String(body.razorpay_payment_id || "");
      const signature = String(body.razorpay_signature || "");

      // The order must be the one we created for this invoice, and the
      // signature must be ours — otherwise this is somebody guessing.
      if (!orderId || orderId !== invoice.razorpayOrderId) {
        return adminJson({ error: "That payment does not belong to this invoice." }, 400);
      }
      if (!checkoutSignatureValid(orderId, paymentId, signature)) {
        return adminJson({ error: "That payment could not be verified." }, 400);
      }

      // A valid checkout signature proves the payment was authorised, not that
      // it was captured — so the order's own status decides, same as the
      // webhook. If capture lags, the webhook applies the credits when it lands.
      const confirmed = await confirmAndApply(orderId, paymentId);
      if (!confirmed || !("granted" in confirmed) || (!confirmed.granted && confirmed.invoice.status !== "paid")) {
        return adminJson({
          ok: true,
          pending: true,
          message: "Payment received. Your credits will appear in a minute or two, once it clears.",
        });
      }
      const { invoice: updated, granted } = confirmed;
      return adminJson({
        ok: true,
        credits: updated.credits,
        granted,
        message: `Payment received. ${updated.credits.toLocaleString("en-US")} credits added to ${shop}.`,
      });
    }

    return adminJson({ error: "Unknown step." }, 400);
  } catch (error) {
    if (error instanceof InvoiceError) return adminJson({ error: error.message }, error.status);
    console.error("[Portal] pay failed:", error);
    return adminJson({ error: "Something went wrong. Nothing was charged twice." }, 500);
  }
};

export const loader = () => new Response("Method not allowed", { status: 405 });
