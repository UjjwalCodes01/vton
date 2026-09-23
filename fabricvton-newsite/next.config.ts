import type { NextConfig } from "next";

// Shared try-on links live on this domain rather than on the backend's
// hostname, so /look/* is proxied straight through to the app. The pages are
// rendered by the backend (they need the stored image and the product), and
// keeping them under the brand domain is the whole point of the feature.
const BACKEND = process.env.NEXT_PUBLIC_TRYON_API || "https://fabricvton-api.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/look/:path*", destination: `${BACKEND}/look/:path*` },
    ];
  },
};

export default nextConfig;
