import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// customers/data_request — merchant must provide customer data on request
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "CUSTOMERS_DATA_REQUEST") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  const { customer } = payload as { customer: { email?: string } };

  // Log the data request — in production, you would email the data to the merchant
  console.log(
    `[GDPR] Data request for shop: ${shop}, customer: ${customer?.email}`
  );

  // We only store the email address as a lead. We do not store images.
  // No action required beyond logging because we hold no sensitive personal data.
  return new Response("ok", { status: 200 });
};
