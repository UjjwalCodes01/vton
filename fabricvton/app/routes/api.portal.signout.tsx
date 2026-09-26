import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { readJsonLimited } from "../bodylimit.server";
import { readPortalSession } from "../invoices/portal.server";

/**
 * Signs an account out everywhere.
 *
 * Portal sessions are signed tokens with no server-side record, so deleting the
 * cookie alone left a copied token working for the rest of its 12 hours. This
 * stamps the account instead, and every session issued before the stamp is
 * refused from then on. Called server-to-server by the portal.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await readJsonLimited(request);
  const read = readPortalSession(typeof body.session === "string" ? body.session : null);
  // Nothing to revoke is still a successful sign-out from the caller's view.
  if (!read?.accountId) return adminJson({ ok: true });

  await db.account.updateMany({
    where: { id: read.accountId },
    data: { sessionsRevokedAt: new Date() },
  });
  return adminJson({ ok: true });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
