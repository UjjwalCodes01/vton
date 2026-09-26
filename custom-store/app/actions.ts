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
  const session = await getPortalSession();
  // Revoked on the backend first, so a copy of the cookie stops working too.
  // A failure here must not trap someone signed in, so it is only logged.
  if (session) await api.signOut(session).catch((error) => console.error("[signout] revoke failed:", error));
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

// ─── Playground ────────────────────────────────────────────────────────────

export interface RunState {
  error?: string;
  taskId?: string;
  creditsLeft?: number;
}

/**
 * Starts a Playground run.
 *
 * The images arrive as data URLs and are forwarded straight through: the
 * browser never holds a session token, and the backend is the only thing that
 * talks to the generator.
 */
export async function runPlayground(payload: {
  personImage: string;
  garmentImage: string;
  title: string;
}): Promise<RunState> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session ended. Sign in again." };

  try {
    const started = await api.playgroundStart(session, payload);
    revalidatePath("/", "layout");
    return started;
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "That run could not be started." };
  }
}

export async function pollPlayground(taskId: string) {
  const session = await getPortalSession();
  if (!session) return { status: "failed" as const, message: "Your session ended. Sign in again." };

  try {
    return await api.playgroundStatus(session, taskId);
  } catch (error) {
    return {
      status: "failed" as const,
      message: error instanceof ApiError ? error.message : "Lost contact with the run.",
    };
  }
}
