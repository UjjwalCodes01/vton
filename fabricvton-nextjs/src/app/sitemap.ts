import type { MetadataRoute } from "next";
import { SITE_URL } from "./(company)/_lib/site";

// The company homepage plus the legal pages that other products (Shopify app, WooCommerce plugin) link to.
// The Clothsy landing page (/clothsy) is noindex and stays out. /tgm is a private prospect showcase and stays out.
const PAGES = ["", "/privacy", "/tos", "/widget-privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.4,
  }));
}
