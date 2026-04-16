import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// app/uninstalled — clean up sessions when app is uninstalled
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  if (topic !== "APP_UNINSTALLED") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  if (session) {
    // Remove the offline session so re-install is fresh
    await db.session.deleteMany({ where: { shop } });

    // Disable the shop config (but keep analytics for billing history)
    await db.shopConfig.updateMany({
      where: { shop },
      data: { isEnabled: false },
    });
  }

  console.log(`[Webhook] App uninstalled for shop: ${shop}`);

  return new Response("ok", { status: 200 });
};
