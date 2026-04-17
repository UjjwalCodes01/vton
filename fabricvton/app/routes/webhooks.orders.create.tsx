import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createHash } from "node:crypto";

// orders/create webhook — for conversion attribution
// Tracks when a customer who used try-on actually purchases

type OrderPayload = {
  id?: string | number;
  email?: string | null;
  total_price?: string | number;
  currency?: string;
  created_at?: string;
  customer?: {
    email?: string | null;
  };
};

const ATTRIBUTION_WINDOW_DAYS = 30;

function hashEmail(email: string) {
  return createHash("sha256").update(email).digest("hex").slice(0, 16);
}

function toDate(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "ORDERS_CREATE") {
    throw new Response("Unhandled topic", { status: 422 });
  }

  const order = payload as OrderPayload;
  const orderId = String(order.id ?? "").trim();
  const orderEmail = String(order.email ?? order.customer?.email ?? "")
    .trim()
    .toLowerCase();
  const orderCreatedAt = toDate(order.created_at);
  const orderValue = Number.parseFloat(String(order.total_price ?? "0"));
  const currency = (order.currency || "USD").toUpperCase();

  if (!orderId) {
    console.warn(`[Webhook] orders/create missing order id for shop: ${shop}`);
    return new Response("ok", { status: 200 });
  }

  const alreadyLogged = await db.adminAuditLog.findFirst({
    where: {
      targetShop: shop,
      action: { in: ["order_conversion_attributed", "order_conversion_unmatched"] },
      details: { contains: `\"orderId\":\"${orderId}\"` },
    },
    select: { id: true },
  });

  if (alreadyLogged) {
    return new Response("ok", { status: 200 });
  }

  if (!orderEmail) {
    await db.adminAuditLog.create({
      data: {
        adminShop: "system:webhook",
        action: "order_conversion_unmatched",
        targetShop: shop,
        details: JSON.stringify({
          orderId,
          reason: "missing_customer_email",
          orderValue: Number.isFinite(orderValue) ? Number(orderValue.toFixed(2)) : 0,
          currency,
          attributed: false,
        }),
      },
    });

    console.log(`[Webhook] Order ${orderId} for ${shop} could not be attributed (missing email).`);
    return new Response("ok", { status: 200 });
  }

  const attributionWindowStart = new Date(orderCreatedAt);
  attributionWindowStart.setDate(attributionWindowStart.getDate() - ATTRIBUTION_WINDOW_DAYS);

  const lead = await db.lead.findFirst({
    where: { shop, email: orderEmail },
    orderBy: { createdAt: "desc" },
  });

  const tryOnEvent = await db.tryOnEvent.findFirst({
    where: {
      shop,
      leadEmail: orderEmail,
      status: "success",
      createdAt: {
        gte: attributionWindowStart,
        lte: orderCreatedAt,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const attributed = Boolean(lead && tryOnEvent);

  await db.adminAuditLog.create({
    data: {
      adminShop: "system:webhook",
      action: attributed ? "order_conversion_attributed" : "order_conversion_unmatched",
      targetShop: shop,
      details: JSON.stringify({
        orderId,
        emailHash: hashEmail(orderEmail),
        leadId: lead?.id ?? null,
        tryOnEventId: tryOnEvent?.id ?? null,
        attributed,
        attributionWindowDays: ATTRIBUTION_WINDOW_DAYS,
        orderCreatedAt: orderCreatedAt.toISOString(),
        orderValue: Number.isFinite(orderValue) ? Number(orderValue.toFixed(2)) : 0,
        currency,
      }),
    },
  });

  console.log(
    `[Webhook] Order ${orderId} for ${shop} attribution: ${attributed ? "matched" : "unmatched"}`
  );

  return new Response("ok", { status: 200 });
};
