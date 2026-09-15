import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clothsy AI - Virtual Try-On",
    short_name: "Clothsy AI",
    description: "AI-Powered Virtual Try-On fitting room for fashion brands and shoppers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0d9488",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["shopping", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
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
}
