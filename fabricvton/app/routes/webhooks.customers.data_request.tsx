import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { recordCustomerDataRequest } from "../privacy.server";

// customers/data_request — the merchant must hand the shopper everything we hold
// about them, within 30 days.
//
// We do hold personal data (lead email, the products they tried on, and their
// try-on history keyed by that email), so this cannot just be logged. The
// snapshot is compiled and stored here, at receipt time, because a
// customers/redact for the same shopper can legitimately arrive first — and a
// lazily-built export would then report nothing while the merchant still owes an
// answer. The merchant downloads it and records delivery at /app/privacy.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "CUSTOMERS_DATA_REQUEST") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  const body = payload as {
    customer?: { id?: number | string; email?: string };
    orders_requested?: unknown;
  };

  const email = body.customer?.email?.trim().toLowerCase() || null;
  const customerId =
    body.customer?.id !== undefined && body.customer?.id !== null
      ? String(body.customer.id)
      : null;

  try {
    const record = await recordCustomerDataRequest({
      shop,
      email,
      customerId,
      orderIds: body.orders_requested,
    });

    console.log(
      `[GDPR] Data request ${record.id} recorded for ${shop} ` +
        `(customer ${customerId ?? "unknown"}, ${record.recordCount} record(s), status ${record.status})`
    );
  } catch (error) {
    // A 500 makes Shopify retry, which is what we want: dropping the request
    // silently would start the merchant's 30-day clock with nothing to serve.
    console.error(
      `[GDPR] Failed to record data request for ${shop}:`,
      error instanceof Error ? error.message : error
    );
    throw new Response("Failed to record data request", { status: 500 });
  }

  return new Response("ok", { status: 200 });
};
