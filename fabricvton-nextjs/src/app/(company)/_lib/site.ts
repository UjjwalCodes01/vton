/** Canonical constants for the FabricVTON company site. */

export const SITE_NAME = "FabricVTON";
export const SITE_URL = "https://www.fabricvton.com";
export const SITE_TAGLINE = "AI research on fabric, garments and how they behave on people.";

/**
 * Clothsy AI is a product built by FabricVTON. This is the single place the product URL is
 * defined: every "Visit Clothsy AI" link on the site reads it from here.
 */
export const CLOTHSY_URL = "https://clothsyai.fabricvton.com";

/** The Clothsy AI landing page still served from this domain (noindex) until the subdomain is live. */
export const CLOTHSY_LEGACY_PATH = "/clothsy";

/** The journal section is hidden until a real post exists. Flip to true once one is published. */
export const SHOW_JOURNAL = false;

/**
 * Placeholder values are written as [TOKEN] and listed in CONTENT_TODO.md. `isPlaceholder` lets
 * components render them as plain text instead of producing a broken mailto:/href.
 */
export const isPlaceholder = (value: string): boolean => value.startsWith("[") && value.endsWith("]");

export const CONTACT_EMAIL = "[CONTACT_EMAIL]";
export const COMPANY_ADDRESS = "[COMPANY_ADDRESS]";

export const SOCIALS = [
  { name: "Email", href: "[CONTACT_EMAIL]" },
  { name: "LinkedIn", href: "[COMPANY_LINKEDIN_URL]" },
  { name: "GitHub", href: "[COMPANY_GITHUB_URL]" },
  { name: "Google Scholar", href: "[COMPANY_SCHOLAR_URL]" },
] as const;
