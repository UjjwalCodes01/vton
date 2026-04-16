import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// shop/redact — called 48h after app uninstall; delete ALL shop data
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  if (topic !== "SHOP_REDACT") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  // Delete all shop data from FabricVTON database
  await Promise.all([
    db.lead.deleteMany({ where: { shop } }),
    db.tryOnEvent.deleteMany({ where: { shop } }),
    db.analyticsDaily.deleteMany({ where: { shop } }),
    db.shopConfig.deleteMany({ where: { shop } }),
  ]);

  console.log(`[GDPR] Full shop redaction complete for: ${shop}`);

  return new Response("ok", { status: 200 });
};
