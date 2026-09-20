import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bolt, ChevronDown, Headset, Shield, Sparkle } from "../components/icons";
import PlanSwitcher from "./PlanSwitcher";

export const metadata: Metadata = {
  title: "Pricing | Clothsy AI",
  description:
    "Start free with 10 credits and upgrade when you're ready. Simple monthly plans for individuals, creators and teams.",
};

const assurances = [
  { icon: <Bolt />, title: "Secure Payments", copy: "Encrypted checkout" },
  { icon: <Shield />, title: "Instant Access", copy: "Start creating immediately" },
  { icon: <Headset />, title: "Cancel Anytime", copy: "No long-term contracts" },
];

const faqs = [
  {
    q: "What are credits used for inside the app?",
    a: "One credit covers one generation — a try-on, a re-style or an upscale. Browsing, saving looks and downloading finished images don't cost anything.",
  },
  {
    q: "How many credits does each tool cost?",
    a: "A standard try-on costs one credit. Higher-resolution renders and background or scene generation cost more, and the exact cost is always shown before you run it.",
  },
  {
    q: "What happens if I don't use my credits?",
    a: "On Basic, credits refresh with each billing month. On Pro and Agency, the credits you pay for don't expire while your subscription is active.",
  },
  {
    q: "Are there any discounts available?",
    a: "Yes — teams buying several seats and brands running high volumes get custom pricing. Get in touch and we'll quote it against your expected volume.",
  },
  {
    q: "Can I adjust my plan after I subscribe?",
    a: "Any time. An upgrade starts immediately with a fresh allowance for the new plan. A downgrade takes effect at the end of the month you've already paid for, so nothing is lost.",
  },
  {
    q: "Is there a free trial?",
    a: "Every account starts free with 10 credits — no card required. Add a plan whenever you want more.",
  },
  {
    q: "What is your refund policy?",
    a: "Cancel whenever you like and your plan keeps running until the end of the period you've paid for; after that it returns to the free tier. We don't pro-rate part-months, so cancelling mid-month doesn't trigger a partial refund.",
  },
  {
    q: "Does my subscription work everywhere I sign in?",
    a: "Yes. Your plan and credits follow your account, so they're the same wherever you sign in.",
  },
];

export default function PricingPage() {
  return (
    <main>
      {/* ---------------- hero ---------------- */}
      <section className="pricing-hero">
        <div className="price-panel">
            <Image
              className="price-panel-bg"
              src="/pricing_hero_bg.png"
              alt=""
              width={1991}
              height={789}
              priority
            />

            <div className="price-copy">
              <span className="pill-badge">
                <Sparkle /> Flexible plans for every stage
              </span>
              <h1 className="display">
                Plans that scale
                <br />
                <em>with your fashion goals.</em>
              </h1>
              <p className="lede">
                Start free with 10 credits. Upgrade when you’re ready to create more, build faster,
                and grow bigger.
              </p>
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
            {faqs.map((faq) => (
              <details className="faq-item" key={faq.q}>
                <summary>
                  {faq.q}
                  <ChevronDown />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>

          <p className="faq-foot">
            Still have questions?{" "}
            <Link href="/resources#help">
              Visit our Help Center <ArrowUpRight className="btn-arrow" />
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
