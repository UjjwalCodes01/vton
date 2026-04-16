import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// customers/redact — merchant requests deletion of a customer's data
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "CUSTOMERS_REDACT") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  const { customer } = payload as { customer: { email?: string } };

  if (customer?.email) {
    // Delete leads (emails) for this customer from this shop
    await db.lead.deleteMany({
      where: { shop, email: customer.email },
    });

    // Anonymize their try-on event records (keep analytics counts, remove PII)
    await db.tryOnEvent.updateMany({
      where: { shop, leadEmail: customer.email },
      data: { leadEmail: null },
    });

    console.log(
      `[GDPR] Redacted data for shop: ${shop}, customer: ${customer.email}`
    );
  }

  return new Response("ok", { status: 200 });
};
