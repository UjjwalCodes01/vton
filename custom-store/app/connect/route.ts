import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api";
import { bindingFor, peekHandoff } from "@/lib/handoff";
import { BIND_COOKIE, bindCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Where a sign-in lands: from Google, or from a merchant's Shopify admin.
 *
 * A Route Handler rather than a page, because Next only permits writing cookies
 * from a Route Handler or a Server Function.
 *
 * Two kinds of link arrive here, and neither is accepted blindly — otherwise
 * anyone could finish a sign-in to their own account, send the link to someone
 * else, and have that person working (and paying invoices) inside it:
 *
 * - Google sign-ins are bound to the browser that started them (see
 *   /login/google) and complete straight away only in that browser.
 * - Shopify arrivals start inside the Shopify admin, where no cookie of ours can
 *   be set first, so they stop at a confirmation naming the store. It can only
 *   be submitted from this site, so a hostile page cannot click it for you.
 *
 * Tokens are single-use on the backend, so a link that leaks through history or
 * a referrer is already spent.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  if (!token) return NextResponse.redirect(new URL("/login", origin));

  if (peekHandoff(token).bound) return exchange(request, token);

  const confirm = new URL("/connect/confirm", origin);
  confirm.searchParams.set("token", token);
  return NextResponse.redirect(confirm);
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

  // Same-origin form posts only. Browsers always send Origin on a POST, and
  // Sec-Fetch-Site where supported; either one disagreeing means another site
  // submitted this.
  // Compared against the Host the browser itself sent, not Next's idea of the
  // origin, which can be an internal address behind a proxy.
  const fetchSite = request.headers.get("sec-fetch-site");
  let sentHost = "";
  try {
    sentHost = new URL(request.headers.get("origin") || "").host;
  } catch {
    // No or malformed Origin: refused below.
  }
  const hosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")].filter(Boolean);
  if (!sentHost || !hosts.includes(sentHost) || (fetchSite && fetchSite !== "same-origin")) {
    return NextResponse.redirect(new URL("/login?error=expired", origin), 303);
  }

  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") || "");
  if (!token) return NextResponse.redirect(new URL("/login", origin), 303);
  return exchange(request, token, 303);
}

async function exchange(request: NextRequest, token: string, status = 307) {
  const origin = request.nextUrl.origin;
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, origin), status);
    response.cookies.set(BIND_COOKIE, "", { ...bindCookieOptions, maxAge: 0 });
    return response;
  };

  let result: Awaited<ReturnType<typeof api.exchange>>;
  try {
    result = await api.exchange(token);
  } catch (error) {
    // Distinguish a token that aged out from the API being unreachable —
    // telling someone to "sign in again" when the backend is down sends them
    // round the same loop forever.
    console.error("[connect] sign-in exchange failed:", error);
    return fail(error instanceof ApiError && error.status === 401 ? "expired" : "unavailable");
  }

  // The backend's word on binding, not the unverified peek above.
  if (result.bind) {
    const cookie = request.cookies.get(BIND_COOKIE)?.value || "";
    const expected = Buffer.from(result.bind);
    const actual = Buffer.from(cookie ? bindingFor(cookie) : "");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return fail("expired");
    }
  }

  const response = NextResponse.redirect(new URL("/", origin), status);
  response.cookies.set(SESSION_COOKIE, result.session, sessionCookieOptions);
  response.cookies.set(BIND_COOKIE, "", { ...bindCookieOptions, maxAge: 0 });
  return response;
}
