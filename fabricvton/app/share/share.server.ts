// Shared try-on looks.
//
// The provider hands us a signed URL that expires in two hours, on a hostname
// that names the provider — neither of which belongs in a link a shopper pastes
// into a chat. So when, and only when, a shopper taps Share, we fetch that
// image once, keep a copy of our own, and hand back a short link on our domain
// that survives for RETENTION.sharedLookDays.
//
// This is the single exception to "generated images are never stored", it is
// shopper-initiated, and the shopper privacy notice says so.

import { randomBytes } from "node:crypto";
import db from "../db.server";
import { RETENTION } from "../retention.server";
import { deleteObject, putObject, shareStorageConfigured } from "./storage.server";

/** Anything larger is not a try-on result and is not worth storing. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 22 characters of url-safe randomness: unguessable, still short enough to paste. */
function newToken() {
  return randomBytes(16).toString("base64url").slice(0, 22);
}

export function shareBaseUrl() {
  return (process.env.SHARE_PUBLIC_BASE || "https://clothsyai.fabricvton.com").replace(/\/+$/, "");
}

export function shareConfigured() {
  return shareStorageConfigured();
}

/**
 * Copies one finished try-on into our own storage and returns its public link.
 *
 * The image is fetched here rather than uploaded by the browser so that the
 * shopper's device never has to re-upload megabytes, and so that only a URL the
 * backend itself produced can ever be stored.
 */
export async function createSharedLook(params: {
  shop: string;
  generationId: string;
  imageUrl: string;
  productTitle?: string | null;
  productUrl?: string | null;
  productImage?: string | null;
}) {
  if (!shareStorageConfigured()) {
    throw new Error("Sharing is not configured.");
  }

  const res = await fetch(params.imageUrl);
  if (!res.ok) throw new Error("The try-on image could not be fetched.");

  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  const extension = ALLOWED_TYPES[contentType];
  if (!extension) throw new Error("That try-on image is not an image we can share.");

  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_IMAGE_BYTES) throw new Error("That try-on image is too large to share.");

  const body = Buffer.from(await res.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_BYTES) throw new Error("That try-on image is too large to share.");

  const id = newToken();
  const now = new Date();
  const imageKey = `looks/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${extension}`;

  await putObject(imageKey, body, contentType);

  await db.sharedLook.create({
    data: {
      id,
      shop: params.shop,
      generationId: params.generationId || null,
      imageKey,
      contentType,
      productTitle: params.productTitle || null,
      productUrl: params.productUrl || null,
      productImage: params.productImage || null,
      expiresAt: new Date(now.getTime() + RETENTION.sharedLookDays * 24 * 60 * 60 * 1000),
    },
  });

  return { id, url: `${shareBaseUrl()}/look/${id}` };
}

/** The look behind a link, or null once it has expired or been purged. */
export async function getSharedLook(id: string) {
  const look = await db.sharedLook.findUnique({ where: { id } });
  if (!look) return null;
  // Expired but not yet purged: treat it as gone rather than serving it.
  if (look.expiresAt.getTime() <= Date.now()) return null;
  return look;
}

/**
 * Deletes expired looks, image first.
 *
 * The row is only removed once its object is gone, so a failed delete leaves
 * the pair intact for the next run rather than orphaning an image nobody has a
 * record of — an orphan would sit in the bucket forever.
 */
export async function purgeExpiredLooks(now: Date = new Date()) {
  const expired = await db.sharedLook.findMany({
    where: { expiresAt: { lte: now } },
    take: 200,
  });

  let deleted = 0;
  for (const look of expired) {
    try {
      await deleteObject(look.imageKey);
      await db.sharedLook.delete({ where: { id: look.id } });
      deleted++;
    } catch (error) {
      console.error(`[retention] could not purge shared look ${look.id}:`, error);
    }
  }
  return { deleted, found: expired.length };
}
