import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleSignInUrl } from "@/lib/api";
import { bindingFor } from "@/lib/handoff";
import { BIND_COOKIE, bindCookieOptions } from "@/lib/session";

/**
 * Starts a Google sign-in from this browser.
 *
 * A random value goes into a cookie only this site can read, and its hash goes
 * through Google and back inside the sign-in link. /connect then accepts that
 * link only where the cookie is — so a finished sign-in link sent to someone
 * else cannot sign them into the sender's account.
 */
export async function GET() {
  const value = randomBytes(32).toString("base64url");
  const target = new URL(googleSignInUrl);
  target.searchParams.set("b", bindingFor(value));

  const response = NextResponse.redirect(target);
  response.cookies.set(BIND_COOKIE, value, bindCookieOptions);
  return response;
}
