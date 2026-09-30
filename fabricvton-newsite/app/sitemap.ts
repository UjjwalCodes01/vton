import type { MetadataRoute } from "next";
import { DOC_PAGES } from "./docs/components/pages";
import { GUIDES } from "./lib/content";
import { SITE_URL } from "./lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/pricing",
    "/resources",
    ...GUIDES.map((g) => `/resources/${g.slug}`),
    ...DOC_PAGES.map((page) => page.href),
    "/privacy",
    "/widget-privacy",
    "/tos",
  ];
  return pages.map((path) => ({ url: `${SITE_URL}${path}` }));
}
