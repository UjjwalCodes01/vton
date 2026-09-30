import type { ActionFunctionArgs } from "react-router";
import { randomUUID } from "node:crypto";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { accountForApiKey } from "../invoices/api-keys.server";
import { PlaygroundError, startPlaygroundRun } from "../invoices/playground.server";
import { downloadPublicImage, SafetyBlockError, SafetyUnavailableError } from "../safety.server";
import { checkRateLimits } from "../ratelimit.server";
import { readJsonLimited } from "../bodylimit.server";

async function imageData(input: unknown) {
  if (typeof input !== "string" || !input.startsWith("https://")) throw new PlaygroundError(400, "Use public HTTPS image URLs.");
  const bytes = await downloadPublicImage(input, 4 * 1024 * 1024);
  const type = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg"
    : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? "image/png" : null;
  if (!type) throw new PlaygroundError(400, "Use JPEG or PNG images.");
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return adminJson({ error: "Invalid API key." }, 401);
  try {
    const idempotencyKey = request.headers.get("idempotency-key") || "";
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) return adminJson({ error: "Send an Idempotency-Key header (8–128 letters, digits, _ or -)." }, 400);
    const existing = await db.accountApiRun.findUnique({ where: { accountId_idempotencyKey: { accountId: key.accountId, idempotencyKey } } });
    if (existing) return adminJson({ id: existing.id, status: existing.state, pollUrl: `/api/v1/tryons/${existing.id}` }, 202);

    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    if (body.consent !== true) return adminJson({ error: "Confirm adult consent and photo rights with consent: true." }, 403);
    const limit = await checkRateLimits([{ scope: `customer-api:${key.accountId}`, limit: 12, windowMs: 60_000, label: "API burst" }]);
    if (!limit.allowed) return adminJson({ error: "Rate limit reached. Retry later." }, 429);
    const base = (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
    if (!base) return adminJson({ error: "Try-on is unavailable." }, 503);

    const [personImage, garmentImage] = await Promise.all([imageData(body.personImageUrl), imageData(body.garmentImageUrl)]);
    const reservation = await db.accountApiRun.create({
      data: { id: randomUUID(), accountId: key.accountId, apiKeyId: key.id, idempotencyKey },
    }).catch(async (error: unknown) => {
      if ((error as { code?: string }).code !== "P2002") throw error;
      return db.accountApiRun.findUniqueOrThrow({ where: { accountId_idempotencyKey: { accountId: key.accountId, idempotencyKey } } });
    });
    if (reservation.state !== "starting" || reservation.apiKeyId !== key.id || reservation.runId) {
      return adminJson({ id: reservation.id, status: reservation.state, pollUrl: `/api/v1/tryons/${reservation.id}` }, 202);
    }
    // Only the creator starts work. Duplicate requests must never spend twice.
    const claimed = await db.accountApiRun.updateMany({ where: { id: reservation.id, state: "starting" }, data: { state: "processing" } });
    if (!claimed.count) return adminJson({ id: reservation.id, status: "processing", pollUrl: `/api/v1/tryons/${reservation.id}` }, 202);
    let run;
    try {
      run = await startPlaygroundRun({ accountId: key.accountId, personImage, garmentImage, title: body.title, publicBase: base, consent: true, requestId: reservation.id });
    } catch (error) {
      await db.accountApiRun.update({ where: { id: reservation.id }, data: { state: "failed" } });
      throw error;
    }
    // If this update fails, polling recovers the event by requestId; the spent
    // credit remains tied to that event rather than being silently lost.
    await db.accountApiRun.update({ where: { id: reservation.id }, data: { runId: run.taskId, state: "pending" } });
    return adminJson({ id: reservation.id, status: "pending", pollUrl: `/api/v1/tryons/${reservation.id}` }, 202);
  } catch (error) {
    if (error instanceof PlaygroundError) return adminJson({ error: error.message }, error.status);
    if (error instanceof SafetyBlockError) return adminJson({ error: error.message }, 422);
    if (error instanceof SafetyUnavailableError) return adminJson({ error: error.message }, 503);
    console.error("[customer API] request failed");
    return adminJson({ error: "Try-on could not be started." }, 500);
  }
};

export const loader = () => new Response("Method not allowed", { status: 405 });
