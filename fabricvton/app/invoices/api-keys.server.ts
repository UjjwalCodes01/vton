import { createHash, randomBytes } from "node:crypto";
import db from "../db.server";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/** Credits an account receives with its first API key — once, ever. */
export const FREE_API_CREDITS = 20;

/** A refusal the customer can act on, as opposed to a server fault. */
export class ApiKeyError extends Error {}

/**
 * Creates the account's API key.
 *
 * One active key per account. A lost or leaked key is replaced by revoking it
 * first, so a key can always be rotated but never multiplied.
 *
 * The first key ever created also brings FREE_API_CREDITS. That grant is a row
 * with a reference unique to the account, so revoking and re-creating a key
 * can never earn the free credits a second time.
 */
export async function createAccountKey(accountId: string, name: string) {
  const token = `clothsy_live_${randomBytes(32).toString("base64url")}`;

  return db.$transaction(async (tx) => {
    // Lock the account row so two tabs clicking at once cannot both pass the
    // one-key check below.
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${accountId} FOR UPDATE`;

    const active = await tx.accountApiKey.count({ where: { accountId, revokedAt: null } });
    if (active > 0) {
      throw new ApiKeyError("This account already has an API key. Revoke it to create a replacement.");
    }

    const key = await tx.accountApiKey.create({
      data: { accountId, name: name.trim().slice(0, 60) || "Default", hash: digest(token), prefix: token.slice(0, 22) },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });

    // ON CONFLICT DO NOTHING: an account that already had its free credits gets
    // nothing, without aborting the transaction the key was created in.
    const { count } = await tx.accountCreditGrant.createMany({
      data: [{
        accountId,
        reference: `free-api:${accountId}`,
        amount: FREE_API_CREDITS,
        actor: "system",
        note: "One-time free API credits with the first key",
      }],
      skipDuplicates: true,
    });
    if (count > 0) {
      await tx.account.update({ where: { id: accountId }, data: { credits: { increment: FREE_API_CREDITS } } });
    }

    return { key, token, freeCreditsGranted: count > 0 ? FREE_API_CREDITS : 0 };
  });
}

export async function accountForApiKey(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!/^clothsy_live_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const key = await db.accountApiKey.findUnique({ where: { hash: digest(token) } });
  if (!key || key.revokedAt) return null;
  await db.accountApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return key;
}
