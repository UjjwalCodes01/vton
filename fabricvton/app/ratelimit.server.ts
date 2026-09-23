// Fixed-window rate limiting for the public storefront API.
//
// Try-on generation costs real money per call (YouCam) and real latency, and the
// storefront endpoint is by definition reachable by anyone who can load a
// product page. Without limits a single shopper — or a script pointed at one
// store — can burn a merchant's whole allowance and then their approved usage
// cap in a couple of minutes.
//
// The counters live in Postgres rather than in process memory on purpose: the
// app runs behind a host that may start more than one instance, and an
// in-process Map would silently multiply every limit by the instance count.
// Each check is one atomic INSERT … ON CONFLICT DO UPDATE, so concurrent
// requests cannot both read the same pre-increment count.

import db from "./db.server";

export interface RateLimitRule {
  /** Stable key for this bucket, e.g. `tryon:shop:example.myshopify.com` */
  scope: string;
  /** Requests permitted per window */
  limit: number;
  windowMs: number;
  /** Used in logs to say which rule tripped */
  label: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Which rule tripped, for logging — never returned to the shopper verbatim */
  label?: string;
  retryAfterSeconds: number;
}

const ALLOWED: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

function envInt(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Defaults are generous enough for a busy store and still bound the blast radius. */
export const LIMITS = {
  /** Per anonymous shopper session — the tightest bucket, since it is per person. */
  sessionPerHour: envInt("TRYON_LIMIT_SESSION_PER_HOUR", 12),
  sessionPerMinute: envInt("TRYON_LIMIT_SESSION_PER_MINUTE", 3),
  /** Per client IP, so clearing sessionStorage does not reset the budget. */
  ipPerHour: envInt("TRYON_LIMIT_IP_PER_HOUR", 30),
  /** Per shop, so distributed abuse still cannot drain one merchant's plan. */
  shopPerHour: envInt("TRYON_LIMIT_SHOP_PER_HOUR", 400),
  /**
   * Per shop, per minute — the cap that does not depend on anything the caller
   * can rotate.
   *
   * Session ids and IPs are both client-supplied, so an abusive caller can
   * always present fresh ones; without this, the hourly shop budget could be
   * spent in seconds and a merchant's whole monthly allowance in an afternoon.
   * Sized well above a real storefront's peak: 20/minute is 1,200/hour of
   * headroom against an hourly cap of 400.
   */
  shopPerMinute: envInt("TRYON_LIMIT_SHOP_PER_MINUTE", 20),
  /** Generations allowed to be in flight for one shop at the same time. */
  shopConcurrent: envInt("TRYON_LIMIT_SHOP_CONCURRENT", 6),
  /** Widget-open analytics pings are writes too, so they get their own bucket. */
  pingPerMinute: envInt("TRYON_LIMIT_PING_PER_MINUTE", 30),
  /**
   * Status polls per shopper. The widget polls every 3s for up to 3 minutes, so
   * one generation costs ~20 polls/minute; this leaves room for a shopper with a
   * couple of tabs open without ever throttling a legitimate try-on.
   */
  pollPerMinute: envInt("TRYON_LIMIT_POLL_PER_MINUTE", 60),
  /**
   * Status polls per shop, as the backstop for the per-shopper bucket.
   *
   * Needed because the per-shopper key can be rotated by a hostile caller (it is
   * derived from client-supplied values), whereas the shop is signed. Sized off
   * the concurrency ceiling so it cannot bite a busy-but-legitimate store: every
   * generation the shop is allowed to run concurrently gets a full poll budget,
   * doubled for headroom.
   */
  /**
   * Shares per shopper. Each one costs a provider call and an upload we then
   * store for 30 days, so it is the one shopper action with a running cost
   * after the try-on itself.
   */
  sharePerHour: envInt("TRYON_LIMIT_SHARE_PER_HOUR", 10),
  /** Per shop, so one store cannot fill the bucket on its own. */
  shareShopPerHour: envInt("TRYON_LIMIT_SHARE_SHOP_PER_HOUR", 300),
  shopPollPerMinute: envInt(
    "TRYON_LIMIT_SHOP_POLL_PER_MINUTE",
    envInt("TRYON_LIMIT_SHOP_CONCURRENT", 6) * 25 * 2
  ),
} as const;

/** Window start as epoch milliseconds — see the schema comment on windowStartMs. */
function windowStartMs(windowMs: number, now = Date.now()) {
  return Math.floor(now / windowMs) * windowMs;
}

/**
 * Increments one bucket and reports whether the caller is over its limit.
 *
 * Fails open: if the counter table is unreachable we would rather serve the
 * request than take the storefront widget down on every merchant's product page.
 */
async function consume(rule: RateLimitRule, now = Date.now()): Promise<RateLimitResult> {
  const start = windowStartMs(rule.windowMs, now);
  const id = `rl_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  try {
    const rows = await db.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitWindow" ("id", "scope", "windowStartMs", "count")
      VALUES (${id}, ${rule.scope}, ${BigInt(start)}, 1)
      ON CONFLICT ("scope", "windowStartMs")
      DO UPDATE SET "count" = "RateLimitWindow"."count" + 1
      RETURNING "count"
    `;

    const count = Number(rows[0]?.count ?? 1);
    if (count <= rule.limit) return ALLOWED;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((start + rule.windowMs - now) / 1000)
    );
    return { allowed: false, label: rule.label, retryAfterSeconds };
  } catch (error) {
    console.error(
      `[RateLimit] Counter unavailable for ${rule.scope}; allowing request:`,
      error instanceof Error ? error.message : error
    );
    return ALLOWED;
  }
}

/** Applies rules in order and stops at the first one that trips. */
export async function checkRateLimits(rules: RateLimitRule[]): Promise<RateLimitResult> {
  for (const rule of rules) {
    const result = await consume(rule);
    if (!result.allowed) return result;
  }
  return ALLOWED;
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/**
 * The buckets a generation request must pass.
 *
 * Session first, then IP, then shop: the tightest and cheapest-to-attribute
 * bucket rejects first, so an abusive shopper never consumes the shop's budget.
 */
export function tryOnGenerationRules(params: {
  shop: string;
  sessionId: string | null;
  clientIp: string | null;
}): RateLimitRule[] {
  const rules: RateLimitRule[] = [];

  if (params.sessionId) {
    rules.push({
      scope: `tryon:gen:session:${params.sessionId}`,
      limit: LIMITS.sessionPerMinute,
      windowMs: MINUTE,
      label: "session burst",
    });
    rules.push({
      scope: `tryon:gen:session:${params.sessionId}`,
      limit: LIMITS.sessionPerHour,
      windowMs: HOUR,
      label: "session hourly",
    });
  }

  if (params.clientIp) {
    rules.push({
      scope: `tryon:gen:ip:${params.clientIp}`,
      limit: LIMITS.ipPerHour,
      windowMs: HOUR,
      label: "ip hourly",
    });
  }

  rules.push({
    scope: `tryon:gen:shop:${params.shop}`,
    limit: LIMITS.shopPerMinute,
    windowMs: MINUTE,
    label: "shop burst",
  });
  rules.push({
    scope: `tryon:gen:shop:${params.shop}`,
    limit: LIMITS.shopPerHour,
    windowMs: HOUR,
    label: "shop hourly",
  });

  return rules;
}

export function analyticsPingRules(params: {
  shop: string;
  clientIp: string | null;
}): RateLimitRule[] {
  const key = params.clientIp ?? params.shop;
  return [
    {
      scope: `tryon:ping:${params.shop}:${key}`,
      limit: LIMITS.pingPerMinute,
      windowMs: MINUTE,
      label: "analytics ping",
    },
  ];
}

/**
 * Buckets a status poll must pass.
 *
 * Two layers, because the per-shopper key is only as trustworthy as its source:
 * the widget's session id and the forwarded IP are both client-supplied, and a
 * caller who rotates them (or rotates generation ids) would slip past a
 * per-shopper bucket entirely. The per-shop bucket is keyed on the app-proxy
 * signed shop, which cannot be rotated, and is sized off the concurrency ceiling
 * so a legitimately busy store never trips it.
 */
export function statusPollRules(params: {
  shop: string;
  sessionKey: string;
}): RateLimitRule[] {
  return [
    {
      scope: `tryon:poll:${params.shop}:${params.sessionKey}`,
      limit: LIMITS.pollPerMinute,
      windowMs: MINUTE,
      label: "status poll (shopper)",
    },
    {
      scope: `tryon:poll:shop:${params.shop}`,
      limit: LIMITS.shopPollPerMinute,
      windowMs: MINUTE,
      label: "status poll (shop)",
    },
  ];
}

/**
 * Buckets a share must pass.
 *
 * Sharing writes to object storage and keeps the object for 30 days, so it is
 * limited on the same three axes as a generation: the shopper first, then the
 * IP they came from, then the shop as the backstop.
 */
export function shareRules(params: {
  shop: string;
  sessionId: string | null;
  clientIp: string | null;
}): RateLimitRule[] {
  const rules: RateLimitRule[] = [];

  if (params.sessionId) {
    rules.push({
      scope: `tryon:share:session:${params.sessionId}`,
      limit: LIMITS.sharePerHour,
      windowMs: HOUR,
      label: "share (shopper)",
    });
  }
  if (params.clientIp) {
    rules.push({
      scope: `tryon:share:ip:${params.clientIp}`,
      limit: LIMITS.sharePerHour,
      windowMs: HOUR,
      label: "share (ip)",
    });
  }
  rules.push({
    scope: `tryon:share:shop:${params.shop}`,
    limit: LIMITS.shareShopPerHour,
    windowMs: HOUR,
    label: "share (shop)",
  });

  return rules;
}

/**
 * Client IP from the proxy chain — best effort, and treated as such.
 *
 * Only X-Forwarded-For is read. CF-Connecting-IP, Fly-Client-IP, True-Client-IP
 * and X-Real-IP used to be preferred over it, but nothing in this deployment
 * sets them: the app sits behind Render's load balancer, not Cloudflare or Fly.
 * They were therefore pure caller input, and reading them first meant one header
 * defeated every per-IP bucket in the system.
 *
 * X-Forwarded-For is not trustworthy either. Render appends the real peer, so
 * the right-most entry is honest — but on Shopify traffic that peer is Shopify's
 * own edge, shared by every storefront, so bucketing on it would throttle
 * unrelated shoppers. The left-most entry attributes better and can be forged.
 *
 * So this value is a convenience, never a gate. The limits that actually hold
 * are keyed on the signed shop (see tryOnGenerationRules), which no caller can
 * rotate.
 */
export function clientIpFrom(request: Request): string | null {
  const ip = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  // Cap the length so a hostile header cannot bloat a scope key (and with it the
  // index entry) to an arbitrary size.
  return ip && ip.length <= 45 ? ip : null;
}

/**
 * Drops counter rows for windows that have already closed.
 *
 * Called opportunistically rather than on a schedule — the app has no cron — and
 * cheap because of the windowStartMs index.
 */
export async function purgeExpiredRateLimitWindows(olderThanMs = 2 * HOUR) {
  try {
    const cutoff = BigInt(Date.now() - olderThanMs);
    const { count } = await db.rateLimitWindow.deleteMany({
      where: { windowStartMs: { lt: cutoff } },
    });
    if (count > 0) {
      console.log(`[RateLimit] Purged ${count} expired counter rows`);
    }
  } catch (error) {
    console.error(
      "[RateLimit] Counter purge failed:",
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * True at most once per `everyMs` across all instances, using the same atomic
 * counter as the limiter. Lets housekeeping ride along on shopper traffic
 * without every request paying for it.
 */
export async function shouldRunPeriodically(
  name: string,
  everyMs: number
): Promise<boolean> {
  const result = await consume({
    scope: `housekeeping:${name}`,
    limit: 1,
    windowMs: everyMs,
    label: name,
  });
  return result.allowed;
}
