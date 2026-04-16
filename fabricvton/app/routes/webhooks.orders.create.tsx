import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// orders/create webhook — for conversion attribution
// Tracks when a customer who used try-on actually purchases
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "ORDERS_CREATE") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  // TODO: Implement conversion attribution logic
  // Match order email against Leads table to track try-on → purchase conversion
  const orderPayload = payload as { id?: string | number };
  console.log(`[Webhook] Order created for shop: ${shop}, order: ${orderPayload.id ?? "unknown"}`);

  return new Response("ok", { status: 200 });
};
