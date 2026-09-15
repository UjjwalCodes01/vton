import type { ActionFunctionArgs } from "react-router";
import { eraseCustomerData } from "../privacy.server";
import { sanitizeEmail } from "../tryon-input.server";
import { parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/**
 * Backs WordPress's Tools → Erase Personal Data — the WooCommerce counterpart
 * of Shopify's customers/redact webhook.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);
    const email = sanitizeEmail(parseJsonBody(body).email);
    if (!email) throw new WooAuthError(400, "A valid email address is required", "bad_input");

    const result = await eraseCustomerData(store.shop, email);
    console.log(`[Woo][Privacy] Erased shopper data for ${store.shop}:`, result);
    return wooJson(result);
  } catch (error) {
    return wooError(error, "privacy erase");
  }
};

export const loader = () => methodNotAllowed();
