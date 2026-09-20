import type { MetadataRoute } from "next";

/**
 * Web app manifest for Clothsy AI (the installable product PWA).
 *
 * This is a route handler, not `app/manifest.ts`, on purpose: a root-level `manifest.ts` is auto-linked
 * from every page, which would make the FabricVTON company homepage advertise itself as "Clothsy AI".
 * Only the (clothsy) layout links to /manifest.webmanifest.
 */
const manifest: MetadataRoute.Manifest = {
  name: "Clothsy AI - Virtual Try-On",
  short_name: "Clothsy AI",
  description: "AI-Powered Virtual Try-On fitting room for fashion brands and shoppers.",
  start_url: "/clothsy",
  display: "standalone",
  background_color: "#0f172a",
  theme_color: "#0d9488",
  orientation: "portrait-primary",
  scope: "/",
  categories: ["shopping", "lifestyle", "utilities"],
  icons: [
    { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [
    {
      name: "Try-On Studio",
      short_name: "Studio",
      description: "Experience AI Virtual Try-On in real time",
      url: "/studio",
      icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
    },
    {
      name: "Demo Store",
      short_name: "Demo",
      description: "Browse products and try on outfits",
      url: "/demo",
      icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
    },
    {
      name: "About Clothsy AI",
      short_name: "About",
      description: "Learn about Clothsy AI and our team",
      url: "/about",
      icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
    },
  ],
};

export const dynamic = "force-static";

export function GET() {
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
