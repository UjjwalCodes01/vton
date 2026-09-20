import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import FaqTabs from "../components/FaqTabs";
import { ArrowUpRight, Shield, Sparkle, Swap } from "../components/icons";
import { PRICING_FAQ, SHOPPER_FAQ, STORE_FAQ } from "../lib/content";
import { CONTACT_HREF } from "../lib/site";
import PlanSwitcher from "./PlanSwitcher";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with 10 try-ons a month. Upgrade when your shoppers do. Simple monthly and yearly plans for Shopify and WooCommerce stores.",
  alternates: { canonical: "/pricing" },
};

const assurances = [
  { icon: <Sparkle />, title: "Free to start", copy: "10 try-ons a month on Basic" },
  { icon: <Shield />, title: "No surprise charges", copy: "Your allowance is your limit" },
  { icon: <Swap />, title: "Change or cancel anytime", copy: "Charges appear on your Shopify bill" },
];

const faqGroups = [
  { id: "plans", label: "Plans", items: PRICING_FAQ },
  { id: "stores", label: "For stores", items: STORE_FAQ },
  { id: "shoppers", label: "For shoppers", items: SHOPPER_FAQ },
];

export default function PricingPage() {
  return (
    <main id="main" tabIndex={-1}>
      {/* ---------------- hero ---------------- */}
      <section className="pricing-hero">
        <div className="price-panel">
          <Image className="price-panel-bg" src="/pricing_hero_bg.png" alt="" width={1991} height={789} priority />

          <div className="price-copy">
            <span className="pill-badge">
              <Sparkle /> Flexible plans for every stage
            </span>
            <h1 className="display">
              Plans that scale
              <br />
              <em>with your fashion goals.</em>
            </h1>
            <p className="lede">Start free with 10 try-ons a month. Upgrade when your shoppers do.</p>
          </div>

          <div className="price-visual">
            <Image
              src="/pricing_hero.png"
              alt="A model in a purple jacket beside a stack of garments she can try on"
              width={1528}
              height={1016}
              sizes="(max-width: 900px) 100vw, 48vw"
              priority
            />
          </div>
        </div>
      </section>

      <section className="price-assurances-section">
        <div className="shell price-assurances">
          {assurances.map((item) => (
            <div key={item.title}>
              <span className="icon-chip">{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <span>{item.copy}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- plans ---------------- */}
      <section className="section" id="plans" style={{ paddingTop: "clamp(40px, 5vw, 80px)" }}>
        <div className="shell">
          <PlanSwitcher />
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section className="section faq" id="faq">
        <div className="shell">
          <div className="faq-head">
            <span className="pill-badge">
              <Sparkle /> FAQ
            </span>
            <h2 className="display">Frequently Asked Questions</h2>
          </div>

          <div className="faq-list">
            <FaqTabs groups={faqGroups} />
          </div>

          <p className="faq-foot">
            Still have questions?{" "}
            <Link href="/resources#help">
              Visit our help page <ArrowUpRight className="btn-arrow" />
            </Link>{" "}
            or <a href={CONTACT_HREF}>email us</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
