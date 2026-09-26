import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { deleteSharedLooks } from "../share/share.server";

// shop/redact — called 48h after app uninstall; delete ALL shop data
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  if (topic !== "SHOP_REDACT") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  // Delete all shop data from the Clothsy AI database. PrivacyRequest is included:
  // once the shop itself is redacted there is no merchant left to deliver an
  // export to, so keeping the snapshot would only be keeping personal data.
  // Shared looks hold copies of shoppers' generated images in the bucket, so
  // they go first, objects and rows together.
  await deleteSharedLooks({ shop });

  await Promise.all([
    db.lead.deleteMany({ where: { shop } }),
    db.tryOnEvent.deleteMany({ where: { shop } }),
    db.analyticsDaily.deleteMany({ where: { shop } }),
    db.privacyRequest.deleteMany({ where: { shop } }),
    db.shopConfig.deleteMany({ where: { shop } }),
    db.accountStore.deleteMany({ where: { shop } }),
  ]);

  console.log(`[GDPR] Full shop redaction complete for: ${shop}`);

  return new Response("ok", { status: 200 });
};
