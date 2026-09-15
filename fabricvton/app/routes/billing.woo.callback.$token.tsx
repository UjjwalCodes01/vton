import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { checkoutSignatureValid, publicAppUrl, syncSubscription } from "../woo/billing.server";
import { messagePage } from "../woo/checkout-page.server";

function withParam(url: string, key: string, value: string) {
  const target = new URL(url);
  target.searchParams.set(key, value);
  return target.toString();
}

const redirect = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

/**
 * Where Razorpay's checkout sends the merchant after paying (a form POST).
 *
 * A valid payment signature lets the plan switch immediately instead of
 * waiting for the webhook; the subscription is still re-read from Razorpay
 * before anything changes. Without a valid signature nothing changes, and the
 * merchant goes back to the checkout page.
 */
export const action = async ({ params, request }: ActionFunctionArgs) => {
  const token = params.token ?? "";
  const row = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await db.billingSubscription.findUnique({ where: { checkoutToken: token } })
    : null;
  if (!row) return messagePage("Checkout link not found", "Please choose your plan again from WooCommerce → Clothsy AI.", undefined, 404);

  const form = await request.formData().catch(() => null);
  const field = (name: string) => {
    const value = form?.get(name);
    return typeof value === "string" ? value : "";
  };

  // Verified against the subscription id we stored, never the one posted back.
  const verified = checkoutSignatureValid(field("razorpay_payment_id"), row.id, field("razorpay_signature"));
  if (!verified) {
    return redirect(`${publicAppUrl()}/billing/woo/checkout/${token}?failed=1`);
  }

  // Recorded before asking Razorpay, so a Razorpay hiccup right now can't lose
  // the fact that this checkout was paid (the page won't offer to pay again).
  if (!row.paymentVerifiedAt) {
    await db.billingSubscription.update({ where: { id: row.id }, data: { paymentVerifiedAt: new Date() } });
  }
  try {
    await syncSubscription(row.id);
  } catch (error) {
    // The payment went through; the webhook will finish the job.
    console.error(`[Billing] Sync after checkout failed for ${row.id}:`, error);
  }
  return redirect(withParam(row.returnUrl, "clothsy_billing", row.startAt ? "scheduled" : "success"));
};

export const loader = async ({ params }: LoaderFunctionArgs) =>
  redirect(`${publicAppUrl()}/billing/woo/checkout/${encodeURIComponent(params.token ?? "")}`);
