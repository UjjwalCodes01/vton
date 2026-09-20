/**
 * Brand name for the marketing website, used in page metadata and structured data.
 * The website stays FabricVTON until the redesign ships; the Shopify app itself
 * is already Clothsy AI.
 */
export const SITE_NAME = "FabricVTON";

/** Where the marketing site is served. */
export const SITE_URL = "https://www.fabricvton.com";

/**
 * The app's public Shopify App Store listing.
 *
 * Every "Install" button points here rather than at a developer-dashboard
 * install link: those links are tied to one specific app and organization, and
 * the one used previously pointed at an unconfigured app, so merchants landed
 * on a placeholder page instead of the app. The listing always resolves to
 * the published app and works for any merchant.
 */
export const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/fabricvton";

/**
 * Where the Clothsy AI marketing landing page lives on this domain.
 *
 * fabricvton.com/ is now the FabricVTON company site, so the product landing
 * page moved to /clothsy. When Clothsy AI is served from its own subdomain
 * (clothsyai.fabricvton.com) and this app is mounted at that host's root,
 * change this to "/" and every Clothsy link follows.
 */
export const CLOTHSY_HOME = "/clothsy";
