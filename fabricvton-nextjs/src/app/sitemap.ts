import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

// Public pages only. /tgm is a private showcase for one prospect and stays out.
const PAGES = ["", "/about", "/demo", "/privacy", "/tos", "/widget-privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
