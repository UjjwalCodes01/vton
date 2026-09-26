import type { ActionFunctionArgs } from "react-router";
import { adminJson } from "../admin/api.server";
import db from "../db.server";
import { subjectFromSession } from "../invoices/subject.server";
import {
  PlaygroundError,
  playgroundRunStatus,
  startPlaygroundRun,
} from "../invoices/playground.server";
import { checkRateLimits } from "../ratelimit.server";
import { readJsonLimited, IMAGE_JSON_LIMIT } from "../bodylimit.server";

/** Where uploaded garments are served from, for the generator to fetch. */
function publicBase() {
  return (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await readJsonLimited(request, IMAGE_JSON_LIMIT)) as Record<string, unknown>;
    const subject = await subjectFromSession(body.session as string);
    if (!subject) return adminJson({ error: "Session expired." }, 401);

    const accountId = subject.account.id;

    if (body.step === "status") {
      const result = await playgroundRunStatus(accountId, String(body.taskId || ""));
      return adminJson(result);
    }

    if (body.step === "start") {
      // Credits are the real cap; this only stops a stuck client hammering the
      // generator with retries.
      const limit = await checkRateLimits([
        { scope: `playground:${accountId}`, limit: 12, windowMs: 60_000, label: "playground burst" },
      ]);
      if (!limit.allowed) {
        return adminJson({ error: "Too many runs at once. Give it a moment." }, 429);
      }

      const base = publicBase();
      if (!base) return adminJson({ error: "The Playground is not available right now." }, 503);

      const started = await startPlaygroundRun({
        accountId,
        personImage: body.personImage,
        garmentImage: body.garmentImage,
        title: body.title,
        publicBase: base,
      });

      const account = await db.account.findUnique({ where: { id: accountId } });
      return adminJson({ ...started, creditsLeft: account?.credits ?? 0 });
    }

    return adminJson({ error: "Unknown step." }, 400);
  } catch (error) {
    if (error instanceof PlaygroundError) return adminJson({ error: error.message }, error.status);
    console.error("[Playground] request failed:", error);
    return adminJson({ error: "Something went wrong." }, 500);
  }
};

export const loader = () => new Response("Method not allowed", { status: 405 });
