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
  // Emails are stored lowercased by the try-on endpoint, so redaction has to
  // match that or it quietly deletes nothing.
  const email = customer?.email?.trim().toLowerCase();

  if (email) {
    // Delete leads (emails) for this customer from this shop
    await db.lead.deleteMany({
      where: { shop, email },
    });

    // Anonymize their try-on event records (keep analytics counts, remove PII)
    await db.tryOnEvent.updateMany({
      where: { shop, leadEmail: email },
      data: { leadEmail: null },
    });

    // A stored data-request export is a copy of exactly the data being redacted,
    // so it has to go too. The audit record stays — proof that a request was
    // handled is not personal data we were asked to erase — but its payload is
    // dropped and it is marked so the merchant knows why it is now empty.
    await db.privacyRequest.updateMany({
      where: { shop, customerEmail: email },
      data: {
        exportJson: null,
        recordCount: 0,
        note: "Export payload erased following a customers/redact request.",
      },
    });

    console.log(`[GDPR] Redacted data for shop: ${shop}, customer: ${email}`);
  }

  return new Response("ok", { status: 200 });
};
