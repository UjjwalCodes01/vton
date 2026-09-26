import type { NextConfig } from "next";

// Shared try-on links live on this domain rather than on the backend's
// hostname, so /look/* is proxied straight through to the app. The pages are
// rendered by the backend (they need the stored image and the product), and
// keeping them under the brand domain is the whole point of the feature.
// TRYON_API_ORIGIN is read only here, at build/start time, so it does not need the NEXT_PUBLIC_ prefix (which would
// inline it into client bundles). The old name is still read as a fallback so existing deployments keep working.
const BACKEND =
  process.env.TRYON_API_ORIGIN || process.env.NEXT_PUBLIC_TRYON_API || "https://fabricvton-api.onrender.com";

/**
 * Security headers sent on every route. The CSP is deliberately limited to directives that cannot block scripts,
 * styles, images or embeds (framing, <base> and plugins only), so it adds protection without breaking the site.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  // Vercel answers every request with "Access-Control-Allow-Origin: *" unless
  // told otherwise. Nothing here is meant to be read by other sites' scripts,
  // so the only origin allowed is this one.
  { key: "Access-Control-Allow-Origin", value: "https://clothsyai.fabricvton.com" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      { source: "/look/:path*", destination: `${BACKEND}/look/:path*` },
    ];
  },
};

export default nextConfig;
