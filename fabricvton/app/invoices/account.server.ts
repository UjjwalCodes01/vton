// Accounts: who is signed in to the platform, and which stores they can reach.
//
// A merchant arriving from their Shopify admin and a developer signing in with
// Google end up in the same place — an Account — so every screen downstream has
// one kind of subject to reason about instead of two.

import { randomBytes } from "node:crypto";
import db from "../db.server";

function newId() {
  return `acc_${randomBytes(9).toString("base64url")}`;
}

/**
 * The account for a Google identity.
 *
 * Matched on the Google subject first and the email second: the subject is
 * stable when someone changes their address, and the email is what links a
 * Google sign-in to an account a store created earlier.
 */
export async function accountForGoogle(profile: {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}) {
  const email = profile.email.trim().toLowerCase();

  const existing =
    (await db.account.findUnique({ where: { googleSub: profile.sub } })) ??
    (await db.account.findUnique({ where: { email } }));

  if (existing) {
    return db.account.update({
      where: { id: existing.id },
      data: {
        googleSub: profile.sub,
        // Only fill blanks: a name typed here should not be overwritten by
        // whatever Google currently holds.
        name: existing.name ?? profile.name ?? null,
        avatarUrl: profile.picture ?? existing.avatarUrl,
        lastSeenAt: new Date(),
      },
    });
  }

  return db.account.create({
    data: {
      id: newId(),
      email,
      googleSub: profile.sub,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * The account behind a store, created on first arrival.
 *
 * Merchants never sign up: the first time one opens the portal from their
 * Shopify admin, this makes their account and links the store. If the store has
 * no contact address on file we mint a placeholder one, because email is the
 * account's key — they can attach a real identity later by signing in with
 * Google, and `accountForGoogle` will find this row by email if it matches.
 */
export async function accountForShop(shop: string) {
  const link = await db.accountStore.findFirst({ where: { shop }, orderBy: { linkedAt: "asc" } });
  if (link) {
    const account = await db.account.findUnique({ where: { id: link.accountId } });
    if (account) {
      await db.account.update({ where: { id: account.id }, data: { lastSeenAt: new Date() } });
      return account;
    }
  }

  const store = await db.shopConfig.findUnique({ where: { shop } });
  const email = (store?.adminEmail || `${shop}@stores.clothsyai.invalid`).trim().toLowerCase();

  const existing = await db.account.findUnique({ where: { email } });
  const account =
    existing ??
    (await db.account.create({
      data: {
        id: newId(),
        email,
        name: store?.storeName ?? null,
        lastSeenAt: new Date(),
      },
    }));

  await linkStore(account.id, shop, "shopify");
  return account;
}

export async function linkStore(accountId: string, shop: string, via: "shopify" | "manual") {
  await db.accountStore.upsert({
    where: { accountId_shop: { accountId, shop } },
    update: {},
    create: { accountId, shop, via },
  });
}

export async function unlinkStore(accountId: string, shop: string) {
  await db.accountStore.deleteMany({ where: { accountId, shop } });
}

/** Every store this account may act on. */
export async function storesFor(accountId: string) {
  const links = await db.accountStore.findMany({ where: { accountId }, orderBy: { linkedAt: "asc" } });
  if (links.length === 0) return [];

  const stores = await db.shopConfig.findMany({
    where: { shop: { in: links.map((l) => l.shop) } },
  });

  // Ordered by when they were linked, so the list does not reshuffle itself.
  return links
    .map((link) => stores.find((store) => store.shop === link.shop))
    .filter((store): store is NonNullable<typeof store> => Boolean(store));
}

/** Guards every store-scoped action reached through an account session. */
export async function accountOwnsStore(accountId: string, shop: string) {
  return Boolean(await db.accountStore.findUnique({ where: { accountId_shop: { accountId, shop } } }));
}
