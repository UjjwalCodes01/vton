import type { NextConfig } from "next";

const CLOTHSY = "https://clothsyai.fabricvton.com";

/**
 * Old URLs that search engines indexed before fabricvton.com became the company site. Each one points to the page
 * that now covers the same thing, with a permanent redirect so rankings carry over.
 *
 * Deliberately NOT redirected: /privacy, /tos and /widget-privacy (the Shopify app and WooCommerce plugin link to
 * them directly) and /tgm (a private prospect page, already disallowed in robots.txt).
 */
const nextConfig: NextConfig = {
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
