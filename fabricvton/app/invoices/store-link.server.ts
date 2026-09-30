import { createHash, randomBytes } from "node:crypto";
import db from "../db.server";

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

export function normalizeStoreUrl(platform: string, value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter the full HTTPS store URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || value.length > 500) {
    throw new Error("Enter the full HTTPS store URL without a query or port.");
  }
  if (platform === "shopify") {
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname) || url.pathname !== "/") {
      throw new Error("For Shopify, enter the store's .myshopify.com URL.");
    }
    return `https://${url.hostname}`;
  }
  if (platform !== "woocommerce" || url.hostname === "localhost" || !url.hostname.includes(".")) throw new Error("Enter a public WooCommerce store URL.");
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export async function startStoreLink(accountId: string, platform: string, input: string) {
  const storeUrl = normalizeStoreUrl(platform, input);
  const code = randomBytes(18).toString("base64url");
  await db.storeLinkCode.create({ data: { accountId, platform, storeUrl, codeHash: hash(code), expiresAt: new Date(Date.now() + 15 * 60_000) } });
  const adminUrl = platform === "shopify"
    ? `${storeUrl}/admin/apps`
    : `${storeUrl}/wp-admin/admin.php?page=clothsy-ai`;
  return { code, adminUrl, expiresMinutes: 15 };
}

export async function finishStoreLink(code: string, platform: string, storeUrl: string, shop: string) {
  if (!/^[A-Za-z0-9_-]{24}$/.test(code)) throw new Error("Invalid connection code.");
  const row = await db.storeLinkCode.findUnique({ where: { codeHash: hash(code) } });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.platform !== platform || row.storeUrl !== normalizeStoreUrl(platform, storeUrl)) {
    throw new Error("This connection code expired or belongs to another store.");
  }
  await db.$transaction(async (tx) => {
    const changed = await tx.storeLinkCode.updateMany({ where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!changed.count) throw new Error("Connection code already used.");
    await tx.accountStore.upsert({ where: { accountId_shop: { accountId: row.accountId, shop } }, update: {}, create: { accountId: row.accountId, shop, via: "manual" } });
  });
}
