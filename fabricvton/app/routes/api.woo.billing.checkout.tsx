import type { ActionFunctionArgs } from "react-router";
import { createCheckout, RazorpayError } from "../woo/billing.server";
import { parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/** The merchant chose a paid plan in WordPress: returns our checkout link. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);
    const data = parseJsonBody(body);
    return wooJson(await createCheckout(store, data.plan, data.returnUrl));
  } catch (error) {
    if (error instanceof RazorpayError) {
      console.error("[Billing] Checkout creation failed:", error);
      return wooError(new WooAuthError(502, "Payments are temporarily unavailable. Please try again in a few minutes.", "billing_error"), "billing checkout");
    }
    return wooError(error, "billing checkout");
  }
};

export const loader = () => methodNotAllowed();
