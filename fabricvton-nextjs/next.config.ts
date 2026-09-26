import type { NextConfig } from "next";

const CLOTHSY = "https://clothsyai.fabricvton.com";

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
  { key: "Access-Control-Allow-Origin", value: "https://www.fabricvton.com" },
];

/**
 * Old URLs that search engines indexed before fabricvton.com became the company site. Each one points to the page
 * that now covers the same thing, with a permanent redirect so rankings carry over.
 *
 * Deliberately NOT redirected: /privacy, /tos and /widget-privacy (the Shopify app and WooCommerce plugin link to
 * them directly) and /tgm (a private prospect page, marked noindex on the page itself).
 */
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // legacy Clothsy product pages that lived on this domain
      { source: "/clothsy", destination: CLOTHSY, permanent: true },
      { source: "/clothsy/:path*", destination: CLOTHSY, permanent: true },
      { source: "/demo", destination: `${CLOTHSY}/#demo`, permanent: true },
      { source: "/demo/:path*", destination: `${CLOTHSY}/#demo`, permanent: true },
      { source: "/studio", destination: `${CLOTHSY}/#demo`, permanent: true },
      { source: "/studio/:path*", destination: `${CLOTHSY}/#demo`, permanent: true },
      // Clothsy marketing paths people may have linked on this domain
      { source: "/pricing", destination: `${CLOTHSY}/pricing`, permanent: true },
      { source: "/resources", destination: `${CLOTHSY}/resources`, permanent: true },
      { source: "/resources/:slug", destination: `${CLOTHSY}/resources/:slug`, permanent: true },
      { source: "/features", destination: `${CLOTHSY}/#how`, permanent: true },
      { source: "/how-it-works", destination: `${CLOTHSY}/#how`, permanent: true },
      { source: "/faq", destination: `${CLOTHSY}/pricing#faq`, permanent: true },
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:path*", destination: "/journal", permanent: true },
      // the old "About us" page described the Clothsy team; the company page replaces it
      { source: "/about", destination: "/company", permanent: true },
      { source: "/about-us", destination: "/company", permanent: true },
      { source: "/team", destination: "/company", permanent: true },
    ];
  },
};

export default nextConfig;
