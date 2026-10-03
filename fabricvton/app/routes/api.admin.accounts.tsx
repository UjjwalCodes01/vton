import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { actorFrom, adminError, adminJson, AdminApiError, requireAdminToken } from "../admin/api.server";
import { readJsonLimited } from "../bodylimit.server";
import { notHolder } from "../invoices/api-keys.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const params = new URL(request.url).searchParams;
    const page = Math.min(10000, Math.max(1, Number(params.get("page")) || 1));
    const q = (params.get("q") || "").trim().slice(0, 120);
    const accounts = await db.account.findMany({
      // Standalone keys' hidden holder accounts aren't customers; they're on the API keys page.
      where: q
        ? { AND: [notHolder, { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { id: q }] }] }
        : notHolder,
      orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50,
      select: { id: true, email: true, name: true, credits: true, createdAt: true,
        apiKeys: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true, credits: true, issuedBy: true, note: true } },
        creditGrants: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, reference: true, amount: true, actor: true, createdAt: true } },
        _count: { select: { apiRuns: true } },
      },
    });
    return adminJson({ page, accounts: accounts.map(({ apiKeys, creditGrants, ...account }) => ({ ...account, keys: apiKeys, grants: creditGrants })) });
  } catch (error) { return adminError(error); }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    requireAdminToken(request);
    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    if (body.action !== "grant_credits") throw new AdminApiError(400, "Unknown action.");
    const accountId = String(body.accountId || "");
    // Whatever identifies the payment: a gateway id, a UPI/bank reference, an
    // invoice number, "cash 3 Oct". It is the idempotency key for the grant, so
    // the same reference can never be credited twice.
    const reference = String(body.reference || "").trim().replace(/\s+/g, " ");
    const amount = Number(body.amount);
    if (!accountId) throw new AdminApiError(400, "No account was selected.");
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
      throw new AdminApiError(400, "Credits must be a whole number from 1 to 100,000.");
    }
    if (reference.length < 3 || reference.length > 120 || /\p{Cc}/u.test(reference)) {
      throw new AdminApiError(400, "Enter a payment reference of 3 to 120 characters (for example the payment id, UPI or bank reference, or invoice number).");
    }
    const actor = actorFrom(request, body);
    try {
      const result = await db.$transaction(async (tx) => {
        const grant = await tx.accountCreditGrant.create({ data: { accountId, reference, amount, actor, note: String(body.note || "").slice(0, 500) || null } });
        const account = await tx.account.update({ where: { id: accountId }, data: { credits: { increment: amount } }, select: { id: true, email: true, credits: true } });
        return { grant: { id: grant.id, reference: grant.reference, amount: grant.amount }, account };
      });
      return adminJson(result, 201);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") throw new AdminApiError(409, "Payment reference already credited.");
      // P2003: the grant row's account doesn't exist (it is written first). P2025: the update found no account.
      if (["P2003", "P2025"].includes((error as { code?: string }).code || "")) throw new AdminApiError(404, "Account not found.");
      throw error;
    }
  } catch (error) { return adminError(error); }
};
