import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { eraseCustomerData } from "../privacy.server";

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
    await eraseCustomerData(shop, email);
    console.log(`[GDPR] Redacted data for shop: ${shop}, customer: ${email}`);
  }

  return new Response("ok", { status: 200 });
};
