import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { readPortalSession } from "../invoices/portal.server";
import {
  applyPaidInvoice,
  checkoutSignatureValid,
  InvoiceError,
  orderForInvoice,
  razorpayKeyId,
} from "../invoices/invoice.server";

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
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const shop = readPortalSession(body.session);
    if (!shop) return adminJson({ error: "Session expired." }, 401);

    const invoice = await db.creditInvoice.findFirst({
      where: { id: String(body.invoiceId || ""), shop },
    });
    if (!invoice) return adminJson({ error: "No such invoice." }, 404);

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

      const { invoice: updated, granted } = await applyPaidInvoice(invoice.id, paymentId);
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
