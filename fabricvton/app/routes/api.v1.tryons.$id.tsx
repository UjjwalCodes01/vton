import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { accountForApiKey } from "../invoices/api-keys.server";
import { PlaygroundError, playgroundRunStatus, playgroundShop } from "../invoices/playground.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return adminJson({ error: "Invalid API key." }, 401);
  const row = await db.accountApiRun.findFirst({ where: { id: params.id, accountId: key.accountId } });
  if (!row) return adminJson({ error: "Unknown try-on." }, 404);
  let runId = row.runId;
  if (!runId && row.state === "processing") {
    const event = await db.tryOnEvent.findFirst({ where: { shop: playgroundShop(key.accountId), sessionId: row.id }, select: { id: true } });
    if (event) {
      runId = event.id;
      await db.accountApiRun.update({ where: { id: row.id }, data: { runId, state: "pending" } });
    }
  }
  if (!runId) return adminJson({ id: row.id, status: row.state });
  try {
    const result = await playgroundRunStatus(key.accountId, runId);
    if (result.status !== row.state) await db.accountApiRun.update({ where: { id: row.id }, data: { state: result.status } });
    const base = (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
    return adminJson({ id: row.id, status: result.status, resultUrl: result.imageToken ? `${base}/i/${result.imageToken}` : null, message: result.status === "failed" ? result.message : undefined });
  } catch (error) {
    if (error instanceof PlaygroundError) return adminJson({ error: error.message }, error.status);
    console.error("[customer API poll] status check failed");
    return adminJson({ error: "Could not check try-on status." }, 503);
  }
};

export const action = () => new Response("Method not allowed", { status: 405 });
