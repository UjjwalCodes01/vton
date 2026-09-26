import type { ActionFunctionArgs } from "react-router";
import { randomBytes } from "node:crypto";
import db from "../db.server";
import { RETENTION } from "../retention.server";
import { parseJsonBody, storeSecret, verifySignedRequest, WOO_PLATFORM, WooAuthError } from "../woo/auth.server";
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
    // The callback must be exactly the plugin's own verify route for this site —
    // not merely somewhere under the site's path. A prefix check stopped a
    // neighbour on a subdirectory multisite (example.com/shopA answering for
    // example.com/shopB), but not a child claiming its parent: example.com/shopA
    // could answer for example.com and take that store over. The plugin always
    // sends rest_url('clothsy-ai/v1/verify'), which is one of two shapes.
    const sitePrefix = storeUrlString(siteUrl);
    const verifyPath = storeUrlString(verifyUrl);
    // normaliseStoreUrl drops the query string, but plain-permalink sites serve
    // the REST API at ?rest_route=..., so that one parameter is carried over.
    const restRoute = typeof data.verifyUrl === "string" ? new URL(data.verifyUrl).searchParams.get("rest_route") : null;
    const prettyRoute = verifyPath === `${sitePrefix}/wp-json/clothsy-ai/v1/verify` && !restRoute;
    const plainRoute =
      restRoute === "/clothsy-ai/v1/verify" &&
      (verifyPath === sitePrefix || verifyPath === `${sitePrefix}/index.php`);
    if (!prettyRoute && !plainRoute) {
      throw new UnsafeUrlError("The verify endpoint must be this plugin's route on the store's own site");
    }

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

    // A first-time connection from a site that was connected before takes over
    // that store instead of starting from scratch, so disconnecting and
    // reconnecting (or reconnecting after WordPress salts were reset, which
    // makes the plugin forget its credentials) keeps leads, stats and plan.
    // Answering the challenge from this URL is the same proof of control the
    // original connection gave.
    if (store.connectionStatus === "pending") {
      const previous = await db.shopConfig.findFirst({
        where: {
          platform: WOO_PLATFORM,
          siteUrl: siteUrlString,
          shop: { not: store.shop },
          OR: [
            { connectionStatus: "connected" },
            {
              connectionStatus: "disconnected",
              disconnectedAt: { gte: new Date(Date.now() - RETENTION.wooDisconnectedStoreDays * 24 * 60 * 60 * 1000) },
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });
      if (previous) {
        await db.$transaction([
          db.shopConfig.delete({ where: { shop: store.shop } }),
          db.shopConfig.update({
            where: { shop: previous.shop },
            data: {
              siteSecretEnc: store.siteSecretEnc,
              connectionStatus: "connected",
              siteVerifiedAt: new Date(),
              disconnectedAt: null,
              pluginVersion: store.pluginVersion ?? previous.pluginVersion,
              adminEmail: store.adminEmail ?? previous.adminEmail,
              storeName: store.storeName ?? previous.storeName,
            },
          }),
        ]);
        console.log(`[Woo] ${store.shop} verified at ${siteUrl.origin}; restored previous store ${previous.shop}`);
        return wooJson({ connected: true, siteUrl: siteUrlString, storeId: previous.shop, restored: true });
      }
    }

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
