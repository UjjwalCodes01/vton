import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api";

/**
 * Where a sign-in lands: from Google, or from a merchant's Shopify admin.
 *
 * A Route Handler rather than a page, because Next only permits writing cookies
 * from a Route Handler or a Server Function — setting one while rendering a
 * page throws, which is exactly how this failed before: the exchange succeeded
 * and the cookie write was what broke, reported as an expired link.
 *
 * The one-time token is swapped server-side and then dropped: the redirect
 * leaves nothing sensitive in history or in a referrer.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;

  if (!token) return NextResponse.redirect(new URL("/login", origin));

  let session: string;
  try {
    ({ session } = await api.exchange(token));
  } catch (error) {
    // Distinguish a token that aged out from the API being unreachable —
    // telling someone to "sign in again" when the backend is down sends them
    // round the same loop forever.
    const reason =
      error instanceof ApiError && error.status === 401 ? "expired" : "unavailable";
    console.error("[connect] sign-in exchange failed:", error);
    return NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  }

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set("clothsy_portal", session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  });
  return response;
}
