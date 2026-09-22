import Link from "next/link";
import { LEGAL } from "../lib/site";

const TABS = [
  { href: LEGAL.privacy, label: "Merchant privacy" },
  { href: LEGAL.shopperPrivacy, label: "Shopper privacy" },
  { href: LEGAL.terms, label: "Terms" },
] as const;

/** Small pill switcher shown at the top of every legal page so readers can jump between the three. */
export default function LegalTabs({ current }: { current: string }) {
  return (
    <nav className="legal-tabs" aria-label="Legal pages">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
