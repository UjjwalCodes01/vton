// The portal's own cookie.
//
// It holds the session token minted by Clothsy AI when the merchant arrived
// from their Shopify admin. The token is opaque here — the backend signed it
// and the backend checks it — so this file only decides where it lives and how
// long the browser keeps it.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "clothsy_portal";
const HOURS = 12;

export async function setPortalSession(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HOURS * 3600,
  });
}

export async function clearPortalSession() {
  (await cookies()).delete(COOKIE);
}

export async function getPortalSession() {
  return (await cookies()).get(COOKIE)?.value || null;
}

/** Every signed-in page starts here. */
export async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) redirect("/login");
  return session;
}
