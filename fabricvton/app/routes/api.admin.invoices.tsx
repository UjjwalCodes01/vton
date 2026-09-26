import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { actorFrom, adminError, adminJson, AdminApiError, requireAdminToken } from "../admin/api.server";
import db from "../db.server";
import {
  cancelInvoice,
  createInvoice,
  formatMoney,
  InvoiceError,
  invoicesForAdmin,
  razorpayConfigured,
  sendInvoice,
} from "../invoices/invoice.server";
import { readJsonLimited } from "../bodylimit.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const shop = new URL(request.url).searchParams.get("shop") || undefined;
    return adminJson({
      invoices: await invoicesForAdmin(shop),
      paymentsEnabled: razorpayConfigured(),
    });
  } catch (error) {
    return adminError(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    requireAdminToken(request);
    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const actor = actorFrom(request, body);
    const action = String(body.action || "create");

    if (action === "create") {
      const invoice = await createInvoice({
        shop: String(body.shop || ""),
        credits: Number(body.credits),
        amount: Number(body.amount),
        currency: String(body.currency || "INR"),
        description: (body.description as string) ?? null,
        internalNote: (body.internalNote as string) ?? null,
        createdBy: actor,
        // Drafting and sending in one step is the common case; the admin can
        // still draft first by passing send: false.
        send: body.send !== false,
      });
      await audit(actor, invoice.shop, "invoice_create", {
        id: invoice.id,
        credits: invoice.credits,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
      });
      return adminJson({
        invoice,
        message:
          invoice.status === "sent"
            ? `Invoice sent to ${invoice.shop} — ${formatMoney(invoice.amount, invoice.currency)} for ${invoice.credits.toLocaleString("en-US")} credits.`
            : `Draft saved for ${invoice.shop}.`,
      });
    }

    const id = String(body.id || "");
    if (!id) throw new AdminApiError(400, "An invoice id is required.");

    if (action === "send") {
      const invoice = await sendInvoice(id);
      await audit(actor, invoice.shop, "invoice_send", { id });
      return adminJson({ invoice, message: `Invoice is now visible to ${invoice.shop}.` });
    }

    if (action === "cancel") {
      const invoice = await cancelInvoice(id);
      await audit(actor, invoice.shop, "invoice_cancel", { id });
      return adminJson({ invoice, message: "Invoice cancelled." });
    }

    throw new AdminApiError(400, "Unknown action.");
  } catch (error) {
    if (error instanceof InvoiceError) return adminJson({ error: error.message }, error.status);
    return adminError(error);
  }
};

function audit(actor: string, shop: string, action: string, details: Record<string, unknown>) {
  return db.adminAuditLog.create({
    data: { adminShop: actor, action, targetShop: shop, details: JSON.stringify(details) },
  });
}
