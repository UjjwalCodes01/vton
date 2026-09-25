import type { MetadataRoute } from "next";
import { SITE_URL } from "./(company)/_lib/site";

import { AREAS } from "./(company)/_content/research";
import { POSTS } from "./(company)/_content/journal/meta";

// The company site, plus the legal pages that other products (Shopify app, WooCommerce plugin) link to.
// The Clothsy landing page (/clothsy) is noindex and stays out. /tgm is a private prospect showcase and stays out.
const PAGES = [
  "",
  "/research",
  ...AREAS.map((a) => `/research/${a.slug}`),
  "/research/open-problems",
  "/journal",
  ...POSTS.map((p) => `/journal/${p.slug}`),
  "/products",
  "/company",
  "/careers",
  "/contact",
  "/privacy",
  "/tos",
  "/widget-privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" || path === "/journal" ? "weekly" : "monthly",
    priority: path === "" ? 1 : ["/privacy", "/tos", "/widget-privacy"].includes(path) ? 0.3 : 0.7,
  }));
}
