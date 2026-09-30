import type { LoaderFunctionArgs } from "react-router";
import { accountForApiKey } from "../invoices/api-keys.server";
import { apiError, readApiTryOn } from "../invoices/customer-api.server";
import { checkRateLimits } from "../ratelimit.server";

/** GET /api/v1/tryons/:id — the state of one try-on, documented at /docs/api. */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return apiError(401, "INVALID_API_KEY", "Missing, malformed or revoked API key.");

  // While a run is pending each poll asks the engine for its status, so a tight
  // loop would spend a shared upstream budget. 60 a minute is one every second,
  // far more than a 2–3 second poll needs.
  const limit = await checkRateLimits([
    { scope: `customer-api-poll:${key.accountId}`, limit: 60, windowMs: 60_000, label: "API polling" },
  ]);
  if (!limit.allowed) {
    return apiError(429, "RATE_LIMITED", "Polling too fast. Poll every 2–3 seconds.", {
      "Retry-After": String(limit.retryAfterSeconds || 5),
    });
  }
  return readApiTryOn(key.accountId, String(params.id || ""));
};

export const action = () => apiError(405, "METHOD_NOT_ALLOWED", "Use GET to read a try-on.");
