import type { ActionFunctionArgs } from "react-router";
import { accountForApiKey } from "../invoices/api-keys.server";
import { apiError, apiJson, toApiError, uploadApiImage } from "../invoices/customer-api.server";

/**
 * POST /api/v1/images — upload a photo once, use its id in any number of
 * try-ons for the next 24 hours. Free; documented at /docs/api/endpoints/upload-image.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const key = await accountForApiKey(request);
  if (!key) return apiError(401, "INVALID_API_KEY", "Missing, malformed or revoked API key.");
  try {
    return apiJson(await uploadApiImage(request, key), 201);
  } catch (error) {
    return toApiError(error);
  }
};

export const loader = () => apiError(405, "METHOD_NOT_ALLOWED", "Use POST to upload an image.");
