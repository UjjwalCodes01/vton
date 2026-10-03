import { redirectTo } from "@/lib/redirect";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Where a page goes when the backend refuses the session.
 *
 * The cookie has to be cleared before landing on /login, which sends anyone
 * still holding one back to the dashboard — without this, a revoked or
 * rotated session bounced between the two forever. Pages cannot write
 * cookies while rendering, so this is a Route Handler.
 */
export async function GET() {
  const response = redirectTo("/login?expired=1");
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
