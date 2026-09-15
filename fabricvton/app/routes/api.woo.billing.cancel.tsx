import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { billingState, cancelPlan, RazorpayError } from "../woo/billing.server";
import { verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/** Cancel the paid plan: it runs to the end of the paid period, then Basic. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store } = await verifySignedRequest(request);
    await cancelPlan(store);
    const fresh = await db.shopConfig.findUniqueOrThrow({ where: { shop: store.shop } });
    return wooJson(await billingState(fresh));
  } catch (error) {
    if (error instanceof RazorpayError) {
      return wooError(new WooAuthError(502, "We couldn't cancel your plan just now. Please try again in a few minutes.", "billing_error"), "billing cancel");
    }
    return wooError(error, "billing cancel");
  }
};

export const loader = () => methodNotAllowed();
