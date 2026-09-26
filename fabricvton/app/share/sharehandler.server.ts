// What both platforms' share endpoints do once the caller is authenticated.

import db from "../db.server";
import { checkRateLimits, shareRules } from "../ratelimit.server";
import { createSharedLook, shareBaseUrl, shareConfigured } from "./share.server";
import { cachedResultUrl, rememberResultUrl } from "./imageproxy.server";
import { getGenerationStatus } from "../engine.server";

function clamp(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

/**
 * The "Shop this item" link, but only if it points at this store.
 *
 * The page it lands on carries our brand, so a link to anywhere else would let
 * a caller mint a convincing page on our domain that sends people to a site of
 * their choosing. Shopify links are rebuilt on the shop's own domain (which
 * redirects to its storefront); WooCommerce links must sit under the site URL
 * the store proved it controls.
 */
async function storeProductUrl(shop: string, value: unknown) {
  const text = clamp(value, 600);
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const config = await db.shopConfig.findUnique({
    where: { shop },
    select: { platform: true, siteUrl: true },
  });

  if (config?.platform === "woocommerce") {
    if (!config.siteUrl) return null;
    const site = new URL(config.siteUrl);
    const base = site.pathname.replace(/\/+$/, "");
    const underSite = url.pathname === base || url.pathname.startsWith(`${base}/`);
    return url.origin === site.origin && underSite ? url.toString() : null;
  }

  // Shopify: keep only a product path, and put it on the shop's own domain.
  const productPath =
    /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:collections\/[A-Za-z0-9%._~-]+\/)?products\/[A-Za-z0-9%._~-]+\/?$/i;
  if (!productPath.test(url.pathname)) return null;
  const rebuilt = new URL(`https://${shop}${url.pathname}`);
  const variant = url.searchParams.get("variant");
  if (variant && /^\d{1,20}$/.test(variant)) rebuilt.searchParams.set("variant", variant);
  return rebuilt.toString();
}

export async function handleShareRequest(params: {
  shop: string;
  clientIp: string | null;
  body: Record<string, unknown>;
}) {
  const { shop, body } = params;

  if (!shareConfigured()) {
    return { ok: false as const, status: 503, error: "Sharing is not available right now." };
  }

  const generationId = clamp(body.generationId, 128);
  if (!generationId) {
    return { ok: false as const, status: 400, error: "A finished try-on is required." };
  }

  const limit = await checkRateLimits(
    shareRules({ shop, sessionId: clamp(body.sessionId, 64), clientIp: params.clientIp }),
  );
  if (!limit.allowed) {
    return { ok: false as const, status: 429, error: "Too many shares. Please wait a little." };
  }

  // The generation must belong to the shop this request was authenticated for,
  // so a caller cannot publish another store's try-on under a link of ours.
  const event = await db.tryOnEvent.findFirst({
    where: { shop, OR: [{ id: generationId }, { providerTaskId: generationId }] },
    select: { id: true, productTitle: true, status: true, providerTaskId: true },
  });
  if (!event || !event.providerTaskId) {
    return { ok: false as const, status: 404, error: "Unknown try-on." };
  }
  // Only a settled — and so billed — generation can be shared. Sharing used to
  // be a way to fetch an image without ever polling, which is what settles it.
  if (event.status !== "success") {
    return { ok: false as const, status: 409, error: "That try-on is not finished yet." };
  }
  const taskId = event.providerTaskId;

  // Sharing the same try-on twice should hand back the same page rather than
  // storing a second copy of the identical image.
  const existing = await db.sharedLook.findFirst({
    where: { shop, generationId: { in: [event.id, taskId] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return { ok: true as const, status: 200, url: `${shareBaseUrl()}/look/${existing.id}` };
  }

  // The image URL is never taken from the request: it is resolved here, from
  // the provider, for this generation only.
  let imageUrl = cachedResultUrl(taskId);
  if (!imageUrl) {
    const generation = await getGenerationStatus(taskId);
    if (!generation.resultImageUrl) {
      return { ok: false as const, status: 409, error: "That try-on is not finished yet." };
    }
    imageUrl = generation.resultImageUrl;
    rememberResultUrl(taskId, imageUrl);
  }

  const look = await createSharedLook({
    shop,
    generationId: event.id,
    imageUrl,
    // The headline comes from our record of the try-on, never from the request:
    // it is what the page claims, under our name.
    productTitle: event.productTitle,
    productUrl: await storeProductUrl(shop, body.productUrl),
    productImage: null,
  });

  return { ok: true as const, status: 200, url: look.url };
}
