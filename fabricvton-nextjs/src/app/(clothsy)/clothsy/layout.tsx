import type { Metadata } from "next";

/**
 * The Clothsy AI product landing page. fabricvton.com/ is now the FabricVTON company site, so this
 * page stays reachable at /clothsy but out of search results until Clothsy AI has its own host.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ClothsyLandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
