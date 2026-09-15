import type { ActionFunctionArgs } from "react-router";
import { randomBytes } from "node:crypto";
import db from "../db.server";
import { parseJsonBody, storeSecret, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { hmacHex, safeEqual } from "../woo/crypto.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";
import { fetchStoreJson, normaliseStoreUrl, storeUrlString, UnsafeUrlError } from "../woo/net.server";

/**
 * Step 2 of connecting: prove the store controls the URL it registered.
 *
 * The backend calls the store's own verify endpoint with a fresh challenge;
 * only a WordPress site holding this store's secret can answer it. The same
 * endpoint handles a site that moved: the plugin sends its new URL, and the
 * connection moves only if the new URL can answer too. A staging copy that
 * never asks to move stays refused, because shopper requests from its origin
 * don't match.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);
    const data = parseJsonBody(body);

    const siteUrl = normaliseStoreUrl(data.siteUrl ?? store.siteUrl);
    const verifyUrl = normaliseStoreUrl(data.verifyUrl);
    if (verifyUrl.origin !== siteUrl.origin) {
      throw new UnsafeUrlError("The verify endpoint must be on the store's own domain");
    }
    // normaliseStoreUrl drops the query string, but plain-permalink sites serve
    // the REST API at ?rest_route=..., so that one parameter is carried over.
    const restRoute = typeof data.verifyUrl === "string" ? new URL(data.verifyUrl).searchParams.get("rest_route") : null;

    const challenge = randomBytes(24).toString("base64url");
    const target = new URL(verifyUrl);
    if (restRoute) target.searchParams.set("rest_route", restRoute);
    target.searchParams.set("store", store.shop);
    target.searchParams.set("challenge", challenge);

    let reply: unknown;
    try {
      reply = await fetchStoreJson(target);
    } catch (error) {
      console.warn(`[Woo] Verify callback to ${target.origin} failed for ${store.shop}:`, error);
      throw new WooAuthError(
        400,
        "We couldn't reach your site to confirm the connection. Make sure it is publicly reachable (not behind a password or maintenance mode) and try again.",
        "unreachable",
      );
    }

    const proof = (reply as { proof?: unknown })?.proof;
    const expected = hmacHex(storeSecret(store), `clothsy-verify:${store.shop}:${challenge}`);
    if (typeof proof !== "string" || !safeEqual(proof, expected)) {
      throw new WooAuthError(400, "Your site answered, but couldn't confirm the connection. Please reconnect.", "bad_proof");
    }

    const siteUrlString = storeUrlString(siteUrl);
    const moved = store.siteUrl !== siteUrlString;
    await db.shopConfig.update({
      where: { shop: store.shop },
      data: { siteUrl: siteUrlString, connectionStatus: "connected", siteVerifiedAt: new Date() },
    });
    console.log(`[Woo] Verified ${store.shop} at ${siteUrl.origin}${moved ? " (moved)" : ""}`);

    return wooJson({ connected: true, siteUrl: siteUrlString });
  } catch (error) {
    return wooError(error, "verify");
  }
};

export const loader = () => methodNotAllowed();
