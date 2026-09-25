import type { LoaderFunctionArgs } from "react-router";
import { accountForGoogle } from "../invoices/account.server";
import { profileFromCode, stateValid } from "../invoices/google.server";
import { mintHandoff, portalBaseUrl } from "../invoices/portal.server";

/**
 * Where Google returns the browser.
 *
 * Verifies the round trip, turns the code into a profile, finds or makes the
 * account, and hands off to the portal with the same short-lived token a
 * Shopify arrival uses — so the portal has exactly one way in.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const portal = portalBaseUrl();

  const fail = (reason: string) =>
    new Response(null, { status: 302, headers: { Location: `${portal}/login?error=${reason}` } });

  if (url.searchParams.get("error")) return fail("cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const cookieState = (request.headers.get("Cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("oauth_state="))
    ?.slice("oauth_state=".length);

  // Both checks matter: the signature proves we minted it, and the cookie proves
  // it came back through the browser that started.
  if (!code || !state || !stateValid(state) || state !== cookieState) return fail("bad_state");

  try {
    const profile = await profileFromCode(code);
    const account = await accountForGoogle(profile);
    console.log(`[Platform] ${account.email} signed in with Google`);

    const target = new URL(`${portal}/connect`);
    target.searchParams.set("token", mintHandoff(`account:${account.id}`));

    const headers = new Headers({ Location: target.toString() });
    headers.append("Set-Cookie", "oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("[Platform] Google sign-in failed:", error);
    return fail("google_failed");
  }
};
