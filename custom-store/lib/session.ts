import "server-only";

// The portal's own cookies.
//
// The session cookie holds the token Clothsy AI minted at sign-in. It is opaque
// here — the backend signed it and the backend checks it — so this file only
// decides where it lives and how long the browser keeps it.
//
// In production both cookies carry the __Host- prefix: the browser then refuses
// any version of them set by another *.fabricvton.com host, or scoped to a
// path, so a sibling subdomain cannot plant a session of its choosing here.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const PRODUCTION = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = PRODUCTION ? "__Host-clothsy_portal" : "clothsy_portal";
/** Ties a Google sign-in to the browser that started it. */
export const BIND_COOKIE = PRODUCTION ? "__Host-clothsy_bind" : "clothsy_bind";

const HOURS = 12;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: PRODUCTION,
  path: "/",
  maxAge: HOURS * 3600,
};

export const bindCookieOptions = {
  httpOnly: true,
  // Lax, not Strict: the browser comes back from Google through a cross-site
  // top-level redirect, and Lax is what lets the cookie ride along on that.
  sameSite: "lax" as const,
  secure: PRODUCTION,
  path: "/",
  maxAge: 10 * 60,
};

export async function clearPortalSession() {
  // A __Host- cookie is only removed by an expiring write with the same
  // attributes; a bare delete is ignored.
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export async function getPortalSession() {
  return (await cookies()).get(SESSION_COOKIE)?.value || null;
}

/** Every signed-in page starts here. */
export async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) redirect("/login");
  return session;
}
