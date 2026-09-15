import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { buildCsv, csvResponseHeaders } from "../csv.server";
import { verifySignedRequest } from "../woo/auth.server";
import { methodNotAllowed, wooError } from "../woo/http.server";

/** Leads as CSV, streamed by the plugin to the merchant's browser. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store } = await verifySignedRequest(request);
    const leads = await db.lead.findMany({
      where: { shop: store.shop },
      orderBy: { createdAt: "desc" },
    });
    // buildCsv neutralises spreadsheet formula triggers: every value here was
    // typed by a shopper.
    const csv = buildCsv(
      ["Email", "Product", "Date"],
      leads.map((lead) => [lead.email, lead.productTitle ?? "", lead.createdAt]),
    );
    return new Response(csv, { headers: csvResponseHeaders("clothsy-ai-leads.csv") });
  } catch (error) {
    return wooError(error, "leads");
  }
};

export const loader = () => methodNotAllowed();
