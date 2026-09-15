import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { checkRateLimits, clientIpFrom } from "../ratelimit.server";
import { clampText, sanitizeEmail } from "../tryon-input.server";
import { encryptSecret, generateId, generateSecret } from "../woo/crypto.server";
import { WOO_PLATFORM, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";
import { normaliseStoreUrl, storeUrlString } from "../woo/net.server";

const HOUR = 60 * 60 * 1000;

/**
 * Step 1 of connecting a WooCommerce store: the plugin registers and receives
 * a store id and signing secret.
 *
 * This is the only unauthenticated plugin endpoint, which is safe because a
 * fresh store is "pending" and can do nothing until it proves it controls its
 * URL (step 2, /api/woo/verify). Registration is rate limited per IP so it
 * can't be used to mint free-plan tenants in bulk.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const ip = clientIpFrom(request) ?? "unknown";
    const limit = await checkRateLimits([
      { scope: `woo:register:${ip}`, limit: 10, windowMs: HOUR, label: "store registration" },
    ]);
    if (!limit.allowed) {
      throw new WooAuthError(429, "Too many connection attempts. Please try again later.", "rate_limited");
    }

    const text = await request.text();
    if (text.length > 16 * 1024) throw new WooAuthError(413, "Request body too large", "too_large");
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new WooAuthError(400, "Body must be JSON", "bad_json");
    }

    const siteUrl = normaliseStoreUrl(data.siteUrl);
    const storeId = generateId("woo_");
    const secret = generateSecret();

    await db.shopConfig.create({
      data: {
        shop: storeId,
        platform: WOO_PLATFORM,
        siteUrl: storeUrlString(siteUrl),
        siteSecretEnc: encryptSecret(secret),
        connectionStatus: "pending",
        adminEmail: sanitizeEmail(data.adminEmail),
        storeName: clampText(data.storeName, 120),
        pluginVersion: clampText(data.pluginVersion, 20),
      },
    });

    console.log(`[Woo] Registered pending store ${storeId} for ${siteUrl.origin}`);
    return wooJson({ storeId, secret }, 201);
  } catch (error) {
    return wooError(error, "register");
  }
};

export const loader = () => methodNotAllowed();
