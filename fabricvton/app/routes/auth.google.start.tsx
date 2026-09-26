import { authorizeUrl, googleConfigured, mintState } from "../invoices/google.server";
import type { LoaderFunctionArgs } from "react-router";
import { portalBaseUrl, validBinding } from "../invoices/portal.server";

/** Begins a Google sign-in. The portal links here; everything else is Google's. */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!googleConfigured()) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${portalBaseUrl()}/login?error=google_unavailable` },
    });
  }

  // The portal passes a hash of a cookie only it can see; it comes back inside
  // the handoff, and the portal refuses the handoff in any other browser.
  const bind = validBinding(new URL(request.url).searchParams.get("b"));
  const state = mintState(bind);
  const headers = new Headers({ Location: authorizeUrl(state) });
  // The state is echoed back by Google; this cookie is what proves the callback
  // reached the same browser that started the sign-in.
  headers.append(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  return new Response(null, { status: 302, headers });
};
