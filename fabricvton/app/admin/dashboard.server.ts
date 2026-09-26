// Everything the admin dashboard reads or changes.
//
// Kept in one module so the HTTP routes stay thin and so every mutation goes
// through the same audit trail: a super admin acting from a browser on another
// domain should leave exactly the trace they would acting from inside Shopify.

import type { Prisma } from "@prisma/client";
import db from "../db.server";
import { getPlan, PLANS } from "../billing.server";
import { allowanceFor } from "../credits.server";
import { creditsFor, planLabelFor, setCustomPlan } from "../customplan.server";
import { checkProviderHealth } from "../youcam.server";
import { AdminApiError } from "./api.server";

const PAGE_SIZE = 25;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─── Overview ──────────────────────────────────────────────────────────────

export async function overview() {
  const [
    stores,
    active,
    suspended,
    shopify,
    woo,
    tryOns,
    tryOns30,
    failed30,
    leads,
    sharedLooks,
    customPlans,
    recentAudit,
  ] = await Promise.all([
    db.shopConfig.count(),
    db.shopConfig.count({ where: { isEnabled: true, isSuspended: false } }),
    db.shopConfig.count({ where: { isSuspended: true } }),
    db.shopConfig.count({ where: { platform: "shopify" } }),
    db.shopConfig.count({ where: { platform: "woocommerce" } }),
    db.tryOnEvent.count({ where: { status: "success" } }),
    db.tryOnEvent.count({ where: { status: "success", createdAt: { gte: daysAgo(30) } } }),
    db.tryOnEvent.count({ where: { status: "failed", createdAt: { gte: daysAgo(30) } } }),
    db.lead.count(),
    db.sharedLook.count(),
    db.shopConfig.count({ where: { customCredits: { not: null } } }),
    db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const busiest = await db.shopConfig.findMany({
    orderBy: { creditsUsed: "desc" },
    take: 6,
    select: {
      shop: true, platform: true, plan: true, creditsUsed: true, monthlyCredits: true, cycleTopUpCredits: true,
      customCredits: true, customPlanLabel: true, isSuspended: true,
    },
  });

  // Never let a provider hiccup take the whole dashboard down with it.
  const provider = await checkProviderHealth().catch(() => ({ ok: false, detail: "unreachable" }));

  return {
    counts: { stores, active, suspended, shopify, woo, tryOns, tryOns30, failed30, leads, sharedLooks, customPlans },
    provider,
    busiest: busiest.map((s) => ({ ...s, planLabel: planLabelFor(s), monthlyCredits: allowanceFor(s) })),
    recentAudit,
  };
}

// ─── Stores ────────────────────────────────────────────────────────────────

export async function listStores(params: {
  q?: string; platform?: string; plan?: string; status?: string; page?: number;
}) {
  const where: Prisma.ShopConfigWhereInput = {};
  if (params.q) {
    where.OR = [
      { shop: { contains: params.q, mode: "insensitive" } },
      { siteUrl: { contains: params.q, mode: "insensitive" } },
      { storeName: { contains: params.q, mode: "insensitive" } },
      { adminEmail: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.platform) where.platform = params.platform;
  if (params.plan) where.plan = params.plan;
  if (params.status === "suspended") where.isSuspended = true;
  if (params.status === "custom") where.customCredits = { not: null };
  if (params.status === "disabled") where.isEnabled = false;
  if (params.status === "disconnected") where.connectionStatus = "disconnected";

  const page = Math.max(1, params.page || 1);
  const [rows, total] = await Promise.all([
    db.shopConfig.findMany({
      where,
      orderBy: { installedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.shopConfig.count({ where }),
  ]);

  return {
    page,
    pageSize: PAGE_SIZE,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    plans: PLANS.map((p) => ({ name: p.name, label: p.label, credits: p.credits })),
    stores: rows.map((s) => ({
      shop: s.shop,
      platform: s.platform,
      storeName: s.storeName,
      siteUrl: s.siteUrl,
      plan: s.plan,
      planLabel: planLabelFor(s),
      isCustom: s.customCredits != null,
      customLabel: s.customPlanLabel,
      customNote: s.customNote,
      credits: allowanceFor(s),
      used: s.creditsUsed,
      isEnabled: s.isEnabled,
      isSuspended: s.isSuspended,
      suspendReason: s.suspendReason,
      connectionStatus: s.connectionStatus,
      pluginVersion: s.pluginVersion,
      adminEmail: s.adminEmail,
      installedAt: s.installedAt,
      billingCycleStart: s.billingCycleStart,
    })),
  };
}

export async function storeDetail(shop: string) {
  const store = await db.shopConfig.findUnique({ where: { shop } });
  if (!store) throw new AdminApiError(404, "No such store.");

  const [subscription, recentTryOns, leadCount, looks, usage, audit] = await Promise.all([
    store.billingId ? db.billingSubscription.findUnique({ where: { id: store.billingId } }) : null,
    db.tryOnEvent.findMany({
      where: { shop }, orderBy: { createdAt: "desc" }, take: 15,
      select: { id: true, status: true, productTitle: true, createdAt: true, processingMs: true, errorCode: true, rating: true },
    }),
    db.lead.count({ where: { shop } }),
    db.sharedLook.count({ where: { shop } }),
    db.analyticsDaily.findMany({ where: { shop, date: { gte: daysAgo(30) } }, orderBy: { date: "asc" } }),
    db.adminAuditLog.findMany({ where: { targetShop: shop }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  // Named fields rather than the whole row: the row also holds the WooCommerce
  // site secret (encrypted), the store's Klaviyo key and billing tokens, none of
  // which the dashboard needs or should be able to leak.
  const safeStore: Record<string, unknown> = { ...store };
  delete safeStore.siteSecretEnc;
  delete safeStore.klaviyoApiKey;
  const safeSubscription: Record<string, unknown> | null = subscription ? { ...subscription } : null;
  if (safeSubscription) delete safeSubscription.checkoutToken;

  return {
    store: {
      ...safeStore,
      planLabel: planLabelFor(store),
      planCredits: getPlan(store.plan).credits,
      // What they can actually spend this cycle, top-ups included.
      monthlyCredits: allowanceFor(store),
    },
    subscription: safeSubscription,
    recentTryOns,
    leadCount,
    looks,
    usage,
    audit,
  };
}

// ─── Actions ───────────────────────────────────────────────────────────────

export type AdminAction =
  | "set_plan" | "set_custom_plan" | "clear_custom_plan" | "reset_credits"
  | "suspend" | "unsuspend" | "enable_widget" | "disable_widget" | "delete_data";

export async function runStoreAction(params: {
  shop: string;
  action: AdminAction;
  actor: string;
  payload: Record<string, unknown>;
}) {
  const { shop, action, actor, payload } = params;
  const store = await db.shopConfig.findUnique({ where: { shop } });
  if (!store) throw new AdminApiError(404, "No such store.");

  let message = "";
  let details: Record<string, unknown> = {};

  switch (action) {
    case "set_plan": {
      const plan = getPlan(String(payload.plan || ""));
      await db.shopConfig.update({
        where: { shop },
        data: {
          plan: plan.name,
          monthlyCredits: plan.credits,
          // A standard plan replaces any custom arrangement, so the plan name
          // and the allowance can never disagree afterwards.
          customPlanLabel: null, customCredits: null, customNote: null,
          customSetAt: null, customSetBy: null,
        },
      });
      details = { plan: plan.name };
      message = `${shop} moved to ${plan.label} (${plan.credits}/mo).`;
      break;
    }
    case "set_custom_plan": {
      const credits = Number(payload.credits);
      if (!Number.isFinite(credits) || credits < 0 || credits > 1_000_000) {
        throw new AdminApiError(400, "Allowance must be between 0 and 1,000,000.");
      }
      await setCustomPlan({
        shop,
        label: String(payload.label || ""),
        credits: Math.round(credits),
        note: String(payload.note || ""),
        setBy: actor,
      });
      details = { credits: Math.round(credits), label: String(payload.label || "Custom"), note: String(payload.note || "") };
      message = `${shop} is on a custom plan of ${Math.round(credits)} try-ons a month.`;
      break;
    }
    case "clear_custom_plan": {
      await setCustomPlan({ shop, label: null, credits: null, note: null, setBy: actor });
      message = `${shop} is back on its plan's own allowance.`;
      break;
    }
    case "reset_credits": {
      await db.shopConfig.update({
        where: { shop },
        data: { creditsUsed: 0, overageReserved: 0, billingCycleStart: new Date() },
      });
      message = `${shop}'s usage reset to 0.`;
      break;
    }
    case "suspend": {
      const reason = String(payload.reason || "Suspended by admin").slice(0, 200);
      await db.shopConfig.update({ where: { shop }, data: { isSuspended: true, suspendReason: reason } });
      details = { reason };
      message = `${shop} suspended.`;
      break;
    }
    case "unsuspend": {
      await db.shopConfig.update({ where: { shop }, data: { isSuspended: false, suspendReason: null } });
      message = `${shop} unsuspended.`;
      break;
    }
    case "enable_widget":
    case "disable_widget": {
      const isEnabled = action === "enable_widget";
      await db.shopConfig.update({ where: { shop }, data: { isEnabled } });
      message = `Try-on ${isEnabled ? "enabled" : "disabled"} for ${shop}.`;
      break;
    }
    case "delete_data": {
      // Deliberately destructive and deliberately explicit: the dashboard asks
      // the operator to type the shop domain before this can be sent.
      if (String(payload.confirm || "") !== shop) {
        throw new AdminApiError(400, "Type the shop domain to confirm.");
      }
      const [leads, events, analytics] = await db.$transaction([
        db.lead.deleteMany({ where: { shop } }),
        db.tryOnEvent.deleteMany({ where: { shop } }),
        db.analyticsDaily.deleteMany({ where: { shop } }),
      ]);
      details = { leads: leads.count, events: events.count, analytics: analytics.count };
      message = `Deleted ${leads.count} leads and ${events.count} try-ons for ${shop}.`;
      break;
    }
    default:
      throw new AdminApiError(400, "Unknown action.");
  }

  await db.adminAuditLog.create({
    data: {
      adminShop: actor,
      action,
      targetShop: shop,
      details: Object.keys(details).length ? JSON.stringify(details) : null,
    },
  });

  return { message };
}

// ─── Analytics, audit, failures ────────────────────────────────────────────

export async function analytics(days: number) {
  const since = daysAgo(Math.min(Math.max(days || 30, 1), 180));
  const rows = await db.analyticsDaily.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" } });

  const byDay = new Map<string, { date: string; opens: number; tryOns: number; failed: number; leads: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const day = byDay.get(key) ?? { date: key, opens: 0, tryOns: 0, failed: 0, leads: 0 };
    day.opens += row.widgetOpens;
    day.tryOns += row.tryOnsCompleted;
    day.failed += row.tryOnsFailed;
    day.leads += row.emailsCaptured;
    byDay.set(key, day);
  }

  const errors = await db.tryOnEvent.groupBy({
    by: ["errorCode"],
    where: { status: "failed", createdAt: { gte: since }, errorCode: { not: null } },
    _count: { errorCode: true },
    orderBy: { _count: { errorCode: "desc" } },
    take: 8,
  });

  return {
    days: [...byDay.values()],
    errors: errors.map((e) => ({ code: e.errorCode, count: e._count.errorCode })),
  };
}

export async function auditLog(page: number) {
  const current = Math.max(1, page || 1);
  const [rows, total] = await Promise.all([
    db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.adminAuditLog.count(),
  ]);
  return { page: current, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export async function failures(page: number) {
  const current = Math.max(1, page || 1);
  const [rows, total] = await Promise.all([
    db.tryOnEvent.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, shop: true, productTitle: true, errorCode: true, errorMessage: true, createdAt: true },
    }),
    db.tryOnEvent.count({ where: { status: "failed" } }),
  ]);
  return { page: current, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, rows };
}

export { creditsFor };
