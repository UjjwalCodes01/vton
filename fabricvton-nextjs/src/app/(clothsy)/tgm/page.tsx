import type { Metadata } from "next";
import TGMPageClient from "./TGMPageClient";

// Private prospect page: kept out of search results here rather than named in robots.txt.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TGMPage() {
  return <TGMPageClient />;
}
