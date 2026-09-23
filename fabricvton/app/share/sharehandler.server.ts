// What both platforms' share endpoints do once the caller is authenticated.

import db from "../db.server";
import { createSharedLook, shareConfigured } from "./share.server";
import { cachedResultUrl, rememberResultUrl } from "./imageproxy.server";
import { getGenerationStatus } from "../youcam.server";

function clamp(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

/** Only a real http(s) link on the store's own page is worth keeping. */
function safeUrl(value: unknown) {
  const text = clamp(value, 600);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function handleShareRequest(shop: string, body: Record<string, unknown>) {
  if (!shareConfigured()) {
    return { ok: false as const, status: 503, error: "Sharing is not available right now." };
  }

  const generationId = clamp(body.generationId, 128);
  if (!generationId) {
    return { ok: false as const, status: 400, error: "A finished try-on is required." };
  }

  // The generation must belong to the shop this request was authenticated for,
  // so a caller cannot publish another store's try-on under a link of ours.
  const event = await db.tryOnEvent.findFirst({
    where: { shop, providerTaskId: generationId },
    select: { id: true, productTitle: true },
  });
  if (!event) {
    return { ok: false as const, status: 404, error: "Unknown try-on." };
  }

  // The image URL is never taken from the request: it is resolved here, from
  // the provider, for this generation only.
  let imageUrl = cachedResultUrl(generationId);
  if (!imageUrl) {
    const generation = await getGenerationStatus(generationId);
    if (!generation.resultImageUrl) {
      return { ok: false as const, status: 409, error: "That try-on is not finished yet." };
    }
    imageUrl = generation.resultImageUrl;
    rememberResultUrl(generationId, imageUrl);
  }

  const look = await createSharedLook({
    shop,
    generationId,
    imageUrl,
    productTitle: clamp(body.productTitle, 200) || event.productTitle,
    productUrl: safeUrl(body.productUrl),
    productImage: safeUrl(body.productImage),
  });

  return { ok: true as const, status: 200, url: look.url };
}
