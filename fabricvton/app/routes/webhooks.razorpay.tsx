import type { ActionFunctionArgs } from "react-router";
import { Prisma } from "@prisma/client";
import db from "../db.server";
import { syncSubscription, webhookSignatureValid } from "../woo/billing.server";

/**
 * Razorpay subscription webhooks (configure subscription.* events to POST here).
 *
 * The event is only a prompt: the subscription is re-fetched from Razorpay and
 * applied (syncSubscription), so its contents are never trusted beyond the id.
 * Anything but a 2xx makes Razorpay retry for 24 hours, which is what we want
 * when the database or Razorpay's API briefly fails.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // The signature covers the raw bytes, so the body must not be parsed first.
  const raw = await request.text();
  if (!webhookSignatureValid(raw, request.headers.get("X-Razorpay-Signature"))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const eventId = request.headers.get("X-Razorpay-Event-Id");
  if (eventId && (await db.billingWebhookEvent.findUnique({ where: { id: eventId } }))) {
    return new Response("ok (duplicate)", { status: 200 });
  }

  let event: { event?: string; payload?: { subscription?: { entity?: { id?: unknown } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const subscriptionId = event.payload?.subscription?.entity?.id;
  if (typeof subscriptionId === "string" && /^sub_[A-Za-z0-9]{6,40}$/.test(subscriptionId)) {
    try {
      const synced = await syncSubscription(subscriptionId);
      if (synced) console.log(`[Billing] Webhook ${event.event} → ${subscriptionId} is ${synced.status}`);
    } catch (error) {
      console.error(`[Billing] Webhook ${event.event} for ${subscriptionId} failed; Razorpay will retry:`, error);
      return new Response("Retry later", { status: 500 });
    }
  }

  // Recorded only after success, so a failed attempt is retried in full.
  if (eventId) {
    await db.billingWebhookEvent.create({ data: { id: eventId.slice(0, 100) } }).catch((error) => {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    });
  }
  return new Response("ok", { status: 200 });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
