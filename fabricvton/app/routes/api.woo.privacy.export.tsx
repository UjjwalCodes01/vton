import type { ActionFunctionArgs } from "react-router";
import { compileCustomerDataExport } from "../privacy.server";
import { sanitizeEmail } from "../tryon-input.server";
import { parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/**
 * Backs WordPress's Tools → Export Personal Data: everything we hold about one
 * shopper of this store. WordPress has already confirmed the request with the
 * shopper by email before its exporters run.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);
    const email = sanitizeEmail(parseJsonBody(body).email);
    if (!email) throw new WooAuthError(400, "A valid email address is required", "bad_input");

    const data = await compileCustomerDataExport({
      shop: store.shop,
      email,
      customerId: null,
      platform: "woocommerce",
    });
    return wooJson(data);
  } catch (error) {
    return wooError(error, "privacy export");
  }
};

export const loader = () => methodNotAllowed();
