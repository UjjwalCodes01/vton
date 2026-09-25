// Turning a portal session into the thing every screen actually needs.
//
// A session names an account, except for ones minted before accounts existed,
// which name a shop. Rather than scatter that distinction through the routes,
// it is resolved once here: callers get an account and the stores it may act on,
// whichever kind of session arrived.

import type { Account, ShopConfig } from "@prisma/client";
import db from "../db.server";
import { accountForShop, storesFor } from "./account.server";
import { readPortalSession } from "./portal.server";

export interface Subject {
  account: Account;
  stores: ShopConfig[];
}

export async function subjectFromSession(token: string | undefined | null): Promise<Subject | null> {
  const read = readPortalSession(token);
  if (!read) return null;

  if (read.accountId) {
    const account = await db.account.findUnique({ where: { id: read.accountId } });
    if (!account) return null;
    return { account, stores: await storesFor(account.id) };
  }

  // Legacy shop session: give it the same shape by finding (or creating) the
  // account behind that store.
  if (read.shop) {
    const account = await accountForShop(read.shop);
    return { account, stores: await storesFor(account.id) };
  }

  return null;
}

/** True when this session may act on that store. */
export function ownsStore(subject: Subject, shop: string) {
  return subject.stores.some((store) => store.shop === shop);
}
