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
export const CONTACT_EMAIL = "fabricvton@gmail.com";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

/** Only channels that exist. Add LinkedIn / GitHub / YouTube here once the handles are confirmed. */
export const SOCIALS = [
  { name: "X", href: "https://x.com/fabricvton93490" },
  { name: "Instagram", href: "https://www.instagram.com/fabricvton/" },
] as const;
