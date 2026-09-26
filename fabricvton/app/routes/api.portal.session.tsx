import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { readJsonLimited } from "../bodylimit.server";
import { accountForShop } from "../invoices/account.server";
import { mintPortalSession, readHandoff } from "../invoices/portal.server";

/**
 * Swaps a one-time handoff token for a portal session.
 *
 * Called server-to-server by the portal, never by a browser, so the handoff
 * token never has to survive in client JavaScript.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await readJsonLimited(request)) as { token?: string };
  const handoff = readHandoff(String(body.token || ""));
  if (!handoff) {
    return adminJson({ error: "That sign-in link has expired. Sign in again." }, 401);
  }

  // One use only. The id is the row's primary key, so a second exchange of the
  // same link fails on the insert — no read-then-write window to race.
  try {
    await db.wooRequestNonce.create({ data: { id: `handoff:${handoff.jti}` } });
  } catch {
    return adminJson({ error: "That sign-in link has already been used. Sign in again." }, 401);
  }

  const subject = handoff.subject;
  const bind = handoff.bind;

  // A handoff names either an account (Google sign-in) or a shop (arrived from
  // the Shopify admin). Both end up as an account session.
  if (subject.startsWith("account:")) {
    const account = await db.account.findUnique({ where: { id: subject.slice("account:".length) } });
    if (!account) return adminJson({ error: "That account no longer exists." }, 401);
    return adminJson({ email: account.email, session: mintPortalSession(account.id), bind });
  }

  const account = await accountForShop(subject);
  return adminJson({ shop: subject, email: account.email, session: mintPortalSession(account.id), bind });
};

export const loader = () => new Response("Method not allowed", { status: 405 });
