import type { ActionFunctionArgs } from "react-router";
import { accountForApiKey } from "../invoices/api-keys.server";
import { apiError, apiJson, createApiTryOn, readApiTryOn } from "../invoices/customer-api.server";

/**
 * How long the request is held open, counted from when it arrived (starting the
 * try-on downloads and screens both images first). The AWS load balancer in
 * front of the API cuts idle connections at 60 s, so the answer has to be on its
 * way well before that.
 */
const WAIT_MS = 45_000;
const STEP_MS = 2_000;

/**
 * POST /api/v1/tryons/sync — start a try-on and wait for it.
 *
 * Same request as POST /tryons. Answers 200 with the finished try-on, or 202
 * with the id to poll if it isn't done within the wait. The internal checks
 * don't count against the caller's polling limit.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const deadline = Date.now() + WAIT_MS;
  const key = await accountForApiKey(request);
  if (!key) return apiError(401, "INVALID_API_KEY", "Missing, malformed or revoked API key.");

  const started = await createApiTryOn(request, key);
  if (started.status !== 202) return started;
  const first = (await started.clone().json()) as { id: string; status: string; pollUrl: string };

  let latest: Record<string, unknown> = { ...first, resultUrl: null };
  while (Date.now() < deadline) {
    const current = await readApiTryOn(key.accountId, first.id);
    if (!current.ok) return current;
    latest = (await current.json()) as Record<string, unknown>;
    if (latest.status !== "pending") return apiJson(latest, 200);
    if (request.signal.aborted) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(STEP_MS, Math.max(0, deadline - Date.now()))));
  }

  return apiJson({ id: first.id, status: "pending", pollUrl: first.pollUrl }, 202);
};

export const loader = () => apiError(405, "METHOD_NOT_ALLOWED", "Use POST to start a try-on.");
