import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import { subjectFromSession } from "../invoices/subject.server";
import { StoreLinkError, startStoreLink } from "../invoices/store-link.server";
import { readJsonLimited } from "../bodylimit.server";
import { checkRateLimits } from "../ratelimit.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const subject = await subjectFromSession(typeof body.session === "string" ? body.session : null);
    if (!subject) return adminJson({ error: "Session expired." }, 401);
    const limit = await checkRateLimits([{ scope: `store-link:${subject.account.id}`, limit: 10, windowMs: 3_600_000, label: "store connections" }]);
    if (!limit.allowed) return adminJson({ error: "Too many connection attempts. Try later." }, 429);
    return adminJson(await startStoreLink(subject.account.id, String(body.platform || ""), String(body.storeUrl || "")));
  } catch (error) {
    if (error instanceof StoreLinkError) return adminJson({ error: error.message }, 400);
    console.error("[store link]", error);
    return adminJson({ error: "Could not start store connection." }, 500);
  }
};
export const loader = () => new Response("Method not allowed", { status: 405 });
