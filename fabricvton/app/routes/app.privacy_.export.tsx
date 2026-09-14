import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { attachmentHeaders } from "../csv.server";

// Resource route: fetched by useDownload() on the Privacy page.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = new URL(request.url).searchParams.get("id") || "";

  // Scoped by shop, so an id from another store's request resolves to nothing.
  const record = id
    ? await db.privacyRequest.findFirst({ where: { id, shop: session.shop } })
    : null;

  if (!record?.exportJson) {
    return new Response("Export not available", { status: 404 });
  }

  return new Response(record.exportJson, {
    headers: attachmentHeaders(
      `clothsy-ai-data-request-${record.id}.json`,
      "application/json; charset=utf-8",
    ),
  });
};
