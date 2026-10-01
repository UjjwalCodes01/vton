import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import db from "../db.server";
import { ApiKeyError, createAccountKey } from "../invoices/api-keys.server";
import { subjectFromSession } from "../invoices/subject.server";
import { readJsonLimited } from "../bodylimit.server";
import { checkRateLimits } from "../ratelimit.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const subject = await subjectFromSession(typeof body.session === "string" ? body.session : null);
    if (!subject) return adminJson({ error: "Session expired." }, 401);
    const accountId = subject.account.id;
    if (body.step === "create") {
      const limit = await checkRateLimits([{ scope: `api-key-create:${accountId}`, limit: 5, windowMs: 3_600_000, label: "API key creation" }]);
      if (!limit.allowed) return adminJson({ error: "Too many new keys this hour. Try again later." }, 429);
      const result = await createAccountKey(accountId, String(body.name || "Default"));
      return adminJson(result, 201);
    }
    if (body.step === "revoke") {
      const id = String(body.id || "");
      await db.accountApiKey.updateMany({ where: { id, accountId, revokedAt: null }, data: { revokedAt: new Date() } });
    } else if (body.step !== "list") return adminJson({ error: "Unknown step." }, 400);
    const [keys, runs] = await Promise.all([
      db.accountApiKey.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true, credits: true, issuedBy: true } }),
      db.accountApiRun.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, state: true, runId: true, createdAt: true } }),
    ]);
    return adminJson({ keys, runs, credits: (await db.account.findUnique({ where: { id: accountId }, select: { credits: true } }))?.credits ?? 0 });
  } catch (error) {
    if (error instanceof ApiKeyError) return adminJson({ error: error.message }, 409);
    console.error("[portal keys]", error);
    return adminJson({ error: "Could not manage API keys." }, 500);
  }
};

export const loader = () => new Response("Method not allowed", { status: 405 });
