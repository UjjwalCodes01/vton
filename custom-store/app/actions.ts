"use server";

// Signing out, and the two halves of a payment.
//
// The payment steps run here rather than in the browser because the portal
// session must never reach client JavaScript: the browser only ever sees a
// Razorpay order id, which is useless without our key secret.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearPortalSession, getPortalSession } from "@/lib/session";

export async function signOut() {
  await clearPortalSession();
  redirect("/login");
}

export interface StartResult {
  error?: string;
  order?: { orderId: string; keyId: string; amount: number; currency: string; description: string; invoiceId: string };
}

export async function startPayment(invoiceId: string): Promise<StartResult> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session expired. Open the portal from your Shopify admin again." };

  try {
    const order = await api.startPayment(session, invoiceId);
    return { order: { ...order, invoiceId } };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not start the payment." };
  }
}

export interface ConfirmResult {
  error?: string;
  message?: string;
}

export async function confirmPayment(
  invoiceId: string,
  fields: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
): Promise<ConfirmResult> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session expired before the payment could be confirmed. Contact us and we will sort it out." };

  try {
    const result = await api.confirmPayment(session, invoiceId, fields);
    revalidatePath("/");
    return { message: result.message };
  } catch (error) {
    // Razorpay has the money at this point, so never imply the payment failed.
    return {
      error:
        error instanceof ApiError
          ? `${error.message} Your payment went through — contact us and we will apply the credits.`
          : "Your payment went through but we could not confirm it here. Contact us and we will apply the credits.",
    };
  }
}
