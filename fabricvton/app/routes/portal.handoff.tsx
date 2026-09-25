import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { mintHandoff, portalBaseUrl } from "../invoices/portal.server";

/**
 * The bridge from the Shopify admin to the merchant portal.
 *
 * Reached only from inside the embedded app, so `authenticate.admin` has
 * already established which shop this is; the merchant never proves anything
 * again. The redirect is top-level because the portal is another origin and
 * would be refused inside Shopify's iframe.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const target = new URL(`${portalBaseUrl()}/connect`);
  target.searchParams.set("token", mintHandoff(session.shop));
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
};
