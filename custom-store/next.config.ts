import type { NextConfig } from "next";

const API_BASE = (process.env.CLOTHSY_API_BASE || "https://fabricvton-api.onrender.com").replace(/\/+$/, "");

// What the portal is allowed to load. Everything is same-origin except Razorpay
// Checkout (script, its payment frames and its own API calls) and Google
// profile pictures. Try-on results come through the /i/ rewrite below, so they
// are same-origin too. 'unsafe-inline' scripts are needed for Next's inline
// bootstrap; the rest of the policy — no framing, no plugins, no foreign form
// targets, no <base> — still holds.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://*.razorpay.com${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://*.razorpay.com",
  "font-src 'self'",
  `connect-src 'self' https://*.razorpay.com${process.env.NODE_ENV === "production" ? "" : " ws:"}`,
  "frame-src https://*.razorpay.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Two Playground images, resized in the browser to 1600px JPEGs, come to
      // roughly 2–3MB as data URLs. This is every action's ceiling, so it stays
      // no larger than that needs.
      bodySizeLimit: "6mb",
    },
  },
  async rewrites() {
    return [
      // Result images, served under this origin: the page never names the API
      // host, and the thumbnails the API returns as /i/<token> resolve here.
      { source: "/i/:token", destination: `${API_BASE}/i/:token` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
