import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { buildCsv, csvResponseHeaders } from "../csv.server";

// Resource route: fetched by useDownload() on the Leads page, never navigated to.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const leads = await db.lead.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  // Every value here is shopper- or merchant-supplied, so it goes through
  // buildCsv, which neutralizes spreadsheet formula triggers as well as quoting.
  // A lead of `=HYPERLINK(...)` would otherwise execute when the merchant opens
  // the export.
  const csv = buildCsv(
    ["Email", "Product", "Date"],
    leads.map((lead) => [lead.email, lead.productTitle ?? "", lead.createdAt]),
  );

  return new Response(csv, { headers: csvResponseHeaders("clothsy-ai-leads.csv") });
};
