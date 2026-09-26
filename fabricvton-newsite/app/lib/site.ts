/** Canonical constants for the Clothsy AI site. Change a URL here and every link follows. */

export const SITE_NAME = "Clothsy AI";
export const SITE_URL = "https://clothsyai.fabricvton.com";

/** Clothsy AI is a product built by FabricVTON. */
export const PARENT_URL = "https://www.fabricvton.com";

export const SHOPIFY_URL = "https://apps.shopify.com/fabricvton";
export const WOO_URL = "https://wordpress.org/plugins/clothsy-ai/";
/** Product Hunt listing (the listing itself is titled "Clothys AI"). */
export const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/clothys-ai";
export const PRODUCT_HUNT_BADGE =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1261271&theme=light&t=1790363009645";

export const BOOK_DEMO_URL = "https://cal.com/fabricvton-hz9xbt/demo";

/** Where we are, shown in the footer. City and country only. */
export const ADDRESS = ["New Delhi, India"] as const;

export const CONTACT_EMAIL = "contact@fabricvton.com";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

/**
 * Legal pages live on this site so shoppers and merchants can read them without leaving Clothsy AI.
 * The installed Shopify app and WooCommerce plugin separately hard-code fabricvton.com/privacy,
 * /tos and /widget-privacy — those stay put; this is just where this site links to for itself.
 */
export const LEGAL = {
  privacy: "/privacy",
  terms: "/tos",
  shopperPrivacy: "/widget-privacy",
} as const;

export const SOCIALS = [
  { name: "Instagram", handle: "clothsyai", href: "https://www.instagram.com/clothsyai/" },
  { name: "X", handle: "clothsyai", href: "https://x.com/clothsyai" },
  { name: "LinkedIn", handle: "clothsy", href: "https://www.linkedin.com/company/clothsy/" },
] as const;

/**
 * Whether a shopper-facing capability ships in the try-on widget today.
 *
 *   "live"    it is in the widget that stores install now
 *   "preview" it is shown in the interactive preview on this site but is NOT in the shipped widget yet
 *
 * Preview items render a small "Preview" tag. When a capability ships, flip it to "live" here and the
 * tag disappears everywhere it is used.
 */
export type Status = "live" | "preview";

export const STATUS = {
  seeItOnYou: "live",
  shopNow: "live",
  keepPhoto: "preview",
  tryAnother: "preview",
  compare: "preview",
  share: "preview",
  addToCart: "preview",
  sessionLooks: "preview",
} as const satisfies Record<string, Status>;
