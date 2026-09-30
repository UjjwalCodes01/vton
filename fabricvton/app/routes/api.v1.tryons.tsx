import type { ActionFunctionArgs } from "react-router";
import { accountForApiKey } from "../invoices/api-keys.server";
import { apiError, createApiTryOn } from "../invoices/customer-api.server";

/** POST /api/v1/tryons — start a try-on. Contract documented at /docs/api. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return apiError(401, "INVALID_API_KEY", "Missing, malformed or revoked API key.");
  return createApiTryOn(request, key);
};

export const loader = () => apiError(405, "METHOD_NOT_ALLOWED", "Use POST to start a try-on.");
