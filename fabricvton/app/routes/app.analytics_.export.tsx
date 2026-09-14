import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { buildCsv, csvResponseHeaders } from "../csv.server";
import { parseDays } from "../analytics-range";

// Resource route: fetched by useDownload() on the Analytics page.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const days = parseDays(new URL(request.url).searchParams.get("days"));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await db.analyticsDaily.findMany({
    where: { shop: session.shop, date: { gte: startDate } },
    orderBy: { date: "desc" },
  });

  // ISO dates rather than toLocaleDateString: the server's locale is not the
  // merchant's, and an unambiguous date sorts correctly in a spreadsheet.
  const csv = buildCsv(
    ["Date", "Widget Opens", "Try-Ons Completed", "Emails Captured", "Failed Try-Ons"],
    dailyStats.map((row) => [
      new Date(row.date).toISOString().slice(0, 10),
      row.widgetOpens,
      row.tryOnsCompleted,
      row.emailsCaptured,
      row.tryOnsFailed,
    ]),
  );

  return new Response(csv, {
    headers: csvResponseHeaders(`clothsy-ai-analytics-${days}d.csv`),
  });
};
