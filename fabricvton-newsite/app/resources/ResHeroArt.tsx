import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bag, Lock, Photo, Sparkle } from "../components/icons";
import { GUIDES } from "../lib/content";

/**
 * Resources hero art, built from the real guides and topics on this page. It replaces a flat image
 * whose cards advertised a blog, case studies and product updates that don't exist.
 */
const guide = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
const CARDS = [
  { g: guide("what-happens-to-your-photo"), cls: "rh-card rh-left", icon: <Lock /> },
  { g: guide("take-a-photo-that-works"), cls: "rh-card rh-center", photo: true },
  { g: guide("add-clothsy-to-shopify"), cls: "rh-card rh-right", icon: <Bag /> },
];
const TOPICS = [
  { label: "Shopper guides", cls: "rh-chip rh-c1", icon: <Photo /> },
  { label: "Store setup", cls: "rh-chip rh-c2", icon: <Bag /> },
  { label: "Privacy", cls: "rh-chip rh-c3", icon: <Lock /> },
  { label: "Plans", cls: "rh-chip rh-c4", icon: <Sparkle /> },
];

export default function ResHeroArt() {
  return (
    <div className="rh-art">
      <svg className="rh-orbit" viewBox="0 0 600 340" aria-hidden="true">
        <ellipse cx="300" cy="170" rx="292" ry="150" />
      </svg>
      {CARDS.map(({ g, cls, icon, photo }) => (
        <Link key={g.slug} className={cls} href={`/resources/${g.slug}`}>
          <span className="rh-cover">
            {photo ? <Image src="/res-hero-dress.webp" alt="" width={420} height={246} sizes="260px" priority /> : icon}
          </span>
          <span className="tag">{g.audience}</span>
          <b>{g.title}</b>
          <i aria-hidden="true">
            <ArrowRight />
          </i>
        </Link>
      ))}
      {TOPICS.map((t) => (
        <span key={t.label} className={t.cls} aria-hidden="true">
          <i>{t.icon}</i>
          {t.label}
        </span>
      ))}
    </div>
  );
}
