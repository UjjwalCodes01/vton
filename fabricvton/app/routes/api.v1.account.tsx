import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { accountForApiKey } from "../invoices/api-keys.server";
import { apiError, apiJson } from "../invoices/customer-api.server";

/** GET /api/v1/account — the credit balance behind this key. */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return apiError(401, "INVALID_API_KEY", "Missing, malformed or revoked API key.");
  const account = await db.account.findUnique({ where: { id: key.accountId }, select: { credits: true } });
  return apiJson({ credits: account?.credits ?? 0 });
};

export const action = () => apiError(405, "METHOD_NOT_ALLOWED", "Use GET to read the account.");
