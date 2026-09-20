import type { MetadataRoute } from "next";
import { GUIDES } from "./lib/content";
import { SITE_URL } from "./lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/features", "/pricing", "/resources", "/about", ...GUIDES.map((g) => `/resources/${g.slug}`)];
  return pages.map((path) => ({ url: `${SITE_URL}${path}` }));
}
