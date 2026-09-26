/** Canonical constants for the FabricVTON company site. */

export const SITE_NAME = "FabricVTON";
export const SITE_URL = "https://www.fabricvton.com";
export const SITE_TAGLINE = "AI research and technology for the visual world.";

/**
 * Clothsy AI is a product built by FabricVTON. Its marketing site moves to its own subdomain;
 * until that host is live, `CLOTHSY_LEARN_MORE_URL` points at the product landing page that
 * still lives on this domain.
 */
export const CLOTHSY_URL = "https://clothsyai.fabricvton.com";
export const CLOTHSY_LEARN_MORE_URL = "/clothsy";

/** One public contact address for the whole site. Swap here to change every "Talk to us" / "Get in touch". */
export const CONTACT_EMAIL = "contact@fabricvton.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
/** Every "Talk to us" / "Contact" goes to the contact page, which carries the form and the address. */
export const CONTACT_HREF = "/contact";

/**
 * Tally form embedded on /contact. Leave empty until the form exists: the page then shows the email
 * address and a mailto button only.
 */
export const CONTACT_FORM_ID = "BzN6Q5";

/** Clothsy AI on Product Hunt (the listing itself is titled "Clothys AI"). */
export const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/clothys-ai";

/** Application form for the virtual try-on research team (Tally). */
export const RESEARCH_FORM_URL = "https://tally.so/r/NpzRM0";

/**
 * Legal pages. They live under the (clothsy) route group today, and the Shopify app and WooCommerce plugin
 * hard-code these exact paths, so keep them working if the pages move.
 */
export const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/tos" },
  { label: "Shopper privacy", href: "/widget-privacy" },
] as const;

/** Where we are, shown in the footer. City and country only. */
export const ADDRESS = ["New Delhi, India"] as const;

/** Official channels (shared with clothsyai.fabricvton.com). Add GitHub / YouTube here once they exist. */
export const SOCIALS = [
  { name: "LinkedIn", handle: "clothsy", href: "https://www.linkedin.com/company/clothsy/" },
  { name: "X", handle: "clothsyai", href: "https://x.com/clothsyai" },
  { name: "Instagram", handle: "clothsyai", href: "https://www.instagram.com/clothsyai/" },
] as const;
