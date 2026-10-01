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

    // Keys issued from the admin dashboard don't count towards the one key a
    // customer may create themselves.
    const active = await tx.accountApiKey.count({ where: { accountId, revokedAt: null, issuedBy: "self" } });
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

// ─── Issued from the admin dashboard ───────────────────────────────────────

/** Largest allowance one key can hold or receive in one change. */
export const MAX_KEY_CREDITS = 1_000_000;

/**
 * Issues a key with its own try-on allowance to the account for `email`
 * (created if needed). Its try-ons draw on that allowance only — never on the
 * account's credits — and it doesn't count towards the self-serve one-key rule.
 * The plaintext key is returned once, here, and never stored.
 */
export async function createAdminKey(params: { email: string; name: string; credits: number; note?: string | null }) {
  const { accountForEmail } = await import("./account.server");
  const account = await accountForEmail(params.email);
  const token = `clothsy_live_${randomBytes(32).toString("base64url")}`;
  const key = await db.accountApiKey.create({
    data: {
      accountId: account.id,
      name: params.name.trim().slice(0, 60) || "Issued key",
      hash: digest(token),
      prefix: token.slice(0, 22),
      credits: params.credits,
      issuedBy: "admin",
      note: params.note?.trim().slice(0, 500) || null,
    },
    select: { id: true, name: true, prefix: true, credits: true, createdAt: true },
  });
  return { account: { id: account.id, email: account.email }, key, token };
}

/** Adds (or, with a negative amount, removes) try-ons on an issued key. Never below zero. */
export async function adjustKeyCredits(keyId: string, amount: number) {
  const changed = await db.$executeRaw`
    UPDATE "AccountApiKey"
    SET "credits" = LEAST(${MAX_KEY_CREDITS}, GREATEST(0, COALESCE("credits", 0) + ${amount}))
    WHERE "id" = ${keyId} AND "issuedBy" IN ('admin', 'standalone') AND "revokedAt" IS NULL`;
  if (!changed) return null;
  return db.accountApiKey.findUnique({
    where: { id: keyId },
    select: { id: true, name: true, prefix: true, credits: true, accountId: true },
  });
}

export async function revokeKey(keyId: string) {
  const { count } = await db.accountApiKey.updateMany({
    where: { id: keyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count > 0;
}

// ─── Standalone keys ───────────────────────────────────────────────────────
//
// A key generated in the dashboard for nobody in particular: no email, no
// sign-in. Everything the API stores — try-ons, uploaded photos, idempotency
// keys — is scoped to an account, and that scoping is what keeps one key from
// reading another's results. So each standalone key gets its own private holder
// account. Holders use the reserved .invalid domain (RFC 2606), which no real
// mailbox or Google account can have, so nobody can ever sign in as one; the
// key is managed only from the dashboard.

const HOLDER_DOMAIN = "keys.invalid";

/** True for the hidden accounts behind standalone keys. */
export const isHolderEmail = (email: string) => email.endsWith(`@${HOLDER_DOMAIN}`);
/** Prisma filter that leaves holder accounts out of customer lists. */
export const notHolder = { NOT: { email: { endsWith: `@${HOLDER_DOMAIN}` } } };

export async function createStandaloneKey(params: { name: string; credits: number; note?: string | null }) {
  const token = `clothsy_live_${randomBytes(32).toString("base64url")}`;
  const name = params.name.trim().slice(0, 60) || "Standalone key";
  return db.$transaction(async (tx) => {
    const holder = await tx.account.create({
      data: {
        id: `acc_${randomBytes(9).toString("base64url")}`,
        email: `key-${randomBytes(8).toString("hex")}@${HOLDER_DOMAIN}`,
        name: `Standalone key: ${name}`,
      },
    });
    const key = await tx.accountApiKey.create({
      data: {
        accountId: holder.id,
        name,
        hash: digest(token),
        prefix: token.slice(0, 22),
        credits: params.credits,
        issuedBy: "standalone",
        note: params.note?.trim().slice(0, 500) || null,
      },
      select: { id: true, name: true, prefix: true, credits: true, createdAt: true },
    });
    return { key, token };
  });
}

export async function renameKey(keyId: string, changes: { name?: string; note?: string | null }) {
  const data: { name?: string; note?: string | null } = {};
  if (typeof changes.name === "string" && changes.name.trim()) data.name = changes.name.trim().slice(0, 60);
  if (changes.note !== undefined) data.note = changes.note?.trim().slice(0, 500) || null;
  if (!Object.keys(data).length) return null;
  const { count } = await db.accountApiKey.updateMany({ where: { id: keyId }, data });
  return count > 0;
}

/** Every key, for the dashboard: newest first, filterable, with usage counts. */
export async function listKeys(params: { q?: string; status?: string; type?: string; page?: number }) {
  const PAGE = 50;
  const page = Math.min(10_000, Math.max(1, params.page || 1));
  const q = (params.q || "").trim().slice(0, 120);

  const where: Record<string, unknown> = {};
  if (params.status === "active") where.revokedAt = null;
  if (params.status === "revoked") where.revokedAt = { not: null };
  if (params.type === "self" || params.type === "admin" || params.type === "standalone") where.issuedBy = params.type;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { prefix: { startsWith: q } },
      { id: q },
      { note: { contains: q, mode: "insensitive" } },
      { account: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.accountApiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true,
        credits: true, issuedBy: true, note: true,
        account: { select: { id: true, email: true, credits: true } },
        _count: { select: { runs: true } },
      },
    }),
    db.accountApiKey.count({ where }),
  ]);

  const succeeded = rows.length
    ? await db.accountApiRun.groupBy({
        by: ["apiKeyId"],
        where: { apiKeyId: { in: rows.map((row) => row.id) }, state: "success" },
        _count: true,
      })
    : [];
  const successBy = new Map(succeeded.map((row) => [row.apiKeyId, row._count]));

  return {
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    total,
    keys: rows.map(({ account, _count, ...key }) => ({
      ...key,
      // Standalone keys belong to nobody: no customer email to show.
      owner: isHolderEmail(account.email) ? null : { id: account.id, email: account.email },
      // What this key can spend: its own allowance, or the owner's balance.
      available: key.credits ?? account.credits,
      requests: _count.runs,
      successful: successBy.get(key.id) ?? 0,
    })),
  };
}
