"use client";

import { motion } from "framer-motion";
import CalDemoButton from "./components/CalDemoButton";
import StickyHeader from "./components/StickyHeader";
import Link from "next/link";
import { FadeUp, StaggerContainer, StaggerItem, ScaleIn } from "./components/ui/Animations";
import { Accordion } from "./components/ui/Accordion";
import { MovingBorderCard } from "./components/ui/MovingBorder";
import { Spotlight } from "./components/ui/Spotlight";
import { TrendingUp, RotateCcw, Share2, Sparkles } from "lucide-react";
import { XRayCompare } from "./components/ui/XRayCompare";

/* ── Data ── */

const stats = [
  { value: "81", suffix: "%", label: "Lift in Add-to-Cart" },
  { value: "67", suffix: "%", label: "Conversion Increase" },
  { value: "25", suffix: "%", label: "Fewer Returns" },
  { value: "61", suffix: "s", label: "Avg. Engagement" },
];

const revenueReasons = [
  {
    title: "Boost conversion rates",
    text: "Customers who see themselves wearing a product buy with confidence — eliminating the #1 reason for cart abandonment in fashion.",
    icon: <TrendingUp className="w-6 h-6" />,
  },
  {
    title: "Cut returns & shipping costs",
    text: "When shoppers know exactly how a garment fits before ordering, they get it right the first time. Your margins stay intact.",
    icon: <RotateCcw className="w-6 h-6" />,
  },
  {
    title: "Go viral on social media",
    text: "Shoppers share their try-on results — turning every session into organic brand discovery you didn't pay for.",
    icon: <Share2 className="w-6 h-6" />,
  },
  {
    title: "Stand out instantly",
    text: "Virtual try-on signals that you're a modern, customer-first brand — the kind people remember and recommend.",
    icon: <Sparkles className="w-6 h-6" />,
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    items: ["50 try-ons / month", "+$0.18 per extra", "Lead capture", "Analytics dashboard", "Standard support"],
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    featured: true,
    items: ["400 try-ons / month", "+$0.13 per extra", "Lead capture", "Analytics dashboard", "Standard support"],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    items: ["1,000 try-ons / month", "+$0.10 per extra", "Lead capture", "Analytics dashboard", "Remove branding"],
  },
  {
    name: "Scale",
    price: "$219",
    period: "/month",
    items: ["2,500 try-ons / month", "+$0.08 per extra", "Lead capture", "Analytics dashboard", "Priority support"],
  },
];

const faqs = [
  {
    question: "How does FabricVTON work?",
    answer: "Customers upload a photo on your product page. Our AI generates a realistic image of them wearing the garment in seconds — no downloads, no apps.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes. Every store gets 100 free try-ons to start. No credit card required.",
  },
  {
    question: "How long does setup take?",
    answer: "Under 5 minutes. Install from the Shopify App Store, pick your products, done. No code, no theme edits.",
  },
  {
    question: "What clothing types work best?",
    answer: "Tops, shirts, jackets, and dresses work best. We recommend clear product images on a plain background.",
  },
];

const steps = [
  {
    pill: "Step 1",
    isResult: false,
    title: "Snap or Upload",
    text: "Shoppers upload a photo or take a mirror selfie directly on the product page.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle></svg>
    ),
  },
  {
    pill: "Step 2",
    isResult: false,
    title: "Smart Processing",
    text: "We auto-crop and center the user for the perfect fit.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path></svg>
    ),
  },
  {
    pill: "Step 3",
    isResult: false,
    title: "AI Generation",
    text: "Our AI realistically maps the product onto the user, preserving fabric drape and lighting.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
    ),
  },
  {
    pill: "Result",
    isResult: true,
    title: "Confidence & Buy",
    text: "Users visualize the fit, hesitation disappears, and conversion rates increase.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
    ),
  },
];

const features = [
  {
    title: "Lead Capture & Integrations",
    text: "Don't just sell, build your audience. Collect emails during the try-on process and sync them instantly to Shopify Segments or Klaviyo. Retarget users who tried but didn't buy with personalized automated flows.",
    footer: (
      <div className="feature-integrations">
        <span className="works-with">Works with:</span>
        <div className="integration-pills">
          <div className="integration-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2" fill="#96bf48"/><path d="M14.5 7.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5-.67 1.5-1.5" fill="#fff"/><path d="M16 10H8l1 7h6z" fill="#fff"/></svg>
            Shopify
          </div>
          <div className="integration-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#222"/><path d="M7 8h10M7 12h6M7 16h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Klaviyo
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Virtual Try-On Widget",
    text: "The core experience. Let customers see themselves in your products instantly. Includes smart auto-cropping for perfect framing, privacy-first data handling (auto-delete after 7 days), and multi-language support for global reach.",
    footer: (
      <div className="feature-tags">
        <span>Auto-Crop</span>
        <span>Privacy First</span>
        <span>Multi-language</span>
      </div>
    ),
  },
  {
    title: "FabricVTON Studio",
    text: "Generate professional product photos without the photoshoot. Use AI models to create stunning UGC-style content for your social media, ads, and product pages directly from your dashboard. Uses the same credits as your plan.",
    footer: (
      <a className="feature-link" href="/studio">Explore Studio capabilities →</a>
    ),
  },
  {
    title: "Actionable Analytics",
    text: "Stop guessing. Track the full customer journey from widget open to 'Add to Cart'. Visualize your funnel and measure the exact conversion lift provided by the try-on experience to prove ROI.",
    footer: (
      <div className="feature-tags">
        <span>Funnel Tracking</span>
        <span>ROI Measurement</span>
        <span>Conversion Lift</span>
      </div>
    ),
  },
];

const INSTALL_URL =
  "https://admin.shopify.com/?organization_id=212189841&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D73cc9210c28108863a55bc041bddb1c0";

/* ── Hero entrance animation variants ── */
const heroVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const heroChild = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } },
};

/* ── Page ── */

export default function HomePage() {
  return (
    <div className="landing-shell">
      <div className="bg-glow bg-glow-one" />
      <div className="bg-glow bg-glow-two" />

      <StickyHeader />

      <main className="container main-content">
        <section className="hero">
          <Spotlight className="hero-spotlight" fill="rgba(13,148,136,0.08)" />
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="hero-inner hero-two-col"
          >
            {/* ── Left: text & CTAs ── */}
            <div className="hero-left">
              <motion.p variants={heroChild} className="eyebrow">
                Built for Shopify
              </motion.p>
              <motion.h1 variants={heroChild}>
                Let customers{" "}
                <span>try on your products,<br />from anywhere.</span>
              </motion.h1>
              <motion.p variants={heroChild} className="hero-copy">
                FabricVTON is an AI virtual fitting room for your Shopify store.
                Customers see how clothes look on their own body — and buy with confidence.
              </motion.p>
              <motion.div variants={heroChild} className="hero-actions">
                <a className="btn btn-primary" href={INSTALL_URL}>
                  Install Free on Shopify
                </a>
                <Link href="/demo" className="btn btn-demo-store">
                  ✨ See it live
                </Link>
                <CalDemoButton />
              </motion.div>
            </div>

            {/* ── Right: X-Ray interactive ── */}
            <motion.div variants={heroChild} className="hero-right">
              <XRayCompare />
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Stats ─── */}
        <section className="section stats-section">
          <FadeUp>
            <p className="stats-hero-headline">
              Bye-bye <span>buyer&apos;s remorse.</span>
            </p>
          </FadeUp>
          <StaggerContainer className="stats-grid" staggerDelay={0.1}>
            {stats.map((s) => (
              <StaggerItem key={s.label}>
                <div className="stat-card">
                  <p className="stat-value">
                    {s.value}
                    <span className="stat-suffix">{s.suffix}</span>
                  </p>
                  <p className="stat-label">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ─── How It Works ─── */}
        <section className="section how-works-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">How it works</p>
              <h2>From browsing to buying in seconds</h2>
              <p className="hero-copy" style={{ marginBottom: "24px" }}>Give your customers the virtual fitting room experience they&apos;ve been waiting for. No app downloads, just instant confidence.</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={INSTALL_URL}>Install Free on Shopify</a>
                <Link href="/demo" className="btn btn-demo-store">✨ See it live</Link>
                <CalDemoButton />
              </div>
            </div>
          </FadeUp>

          <div className="how-works-row-wrap">
            <StaggerContainer className="how-works-row" staggerDelay={0.12}>
              {/* connecting line behind icons */}
              <div className="how-works-connector-line" />
              {steps.map((s) => (
                <StaggerItem key={s.pill}>
                  <div className="how-works-col">
                    <div className="how-works-icon-box">
                      {s.icon}
                      <div className={`how-works-pill${s.isResult ? " how-works-pill-result" : ""}`}>{s.pill}</div>
                    </div>
                    <div className="how-works-text">
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="section features-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">Features</p>
              <h2>All-in-one Virtual Fitting Room</h2>
              <p className="hero-copy" style={{ marginBottom: "24px" }}>Everything you need to increase conversions, capture leads, and create content — in one powerful app.</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={INSTALL_URL}>Install Free on Shopify</a>
                <Link href="/demo" className="btn btn-demo-store">✨ See it live</Link>
                <CalDemoButton />
              </div>
            </div>
          </FadeUp>
          <StaggerContainer className="features-grid" staggerDelay={0.1}>
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <div className="feature-card">
                  <div className="feature-card-body">
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                  <div className="feature-card-footer">{f.footer}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ─── Why It Works ─── */}
        <section className="section reasons-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">Why it works</p>
              <h2>Revenue-driven reasons to add try-on</h2>
            </div>
          </FadeUp>
          <StaggerContainer className="reasons-grid" staggerDelay={0.1}>
            {revenueReasons.map((r) => (
              <StaggerItem key={r.title}>
                <div className="reason-card">
                  <div className="reason-icon-wrap">{r.icon}</div>
                  <div>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="section pricing-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">Pricing</p>
              <h2>Start free. Scale as you grow.</h2>
              <p className="hero-copy">Simple usage-based pricing. No hidden fees.</p>
            </div>
          </FadeUp>
          <StaggerContainer className="pricing-cards" staggerDelay={0.08}>
            {pricing.map((plan) =>
              plan.featured ? (
                <StaggerItem key={plan.name}>
                  <MovingBorderCard className="pricing-card-featured-wrapper">
                    <article className="pricing-card pricing-featured">
                      <div className="pricing-header">
                        <p className="pricing-plan-name">{plan.name}</p>
                        <p className="pricing-plan-price">
                          {plan.price}
                          <span className="pricing-period">{plan.period}</span>
                        </p>
                      </div>
                      <ul className="pricing-plan-list">
                        {plan.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <a className="btn btn-primary pricing-card-btn" href={INSTALL_URL}>
                        Get started
                      </a>
                    </article>
                  </MovingBorderCard>
                </StaggerItem>
              ) : (
                <StaggerItem key={plan.name}>
                  <article className="pricing-card">
                    <div className="pricing-header">
                      <p className="pricing-plan-name">{plan.name}</p>
                      <p className="pricing-plan-price">
                        {plan.price}
                        <span className="pricing-period">{plan.period}</span>
                      </p>
                    </div>
                    <ul className="pricing-plan-list">
                      {plan.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <a className="btn btn-secondary pricing-card-btn" href={INSTALL_URL}>
                      Get started
                    </a>
                  </article>
                </StaggerItem>
              )
            )}
          </StaggerContainer>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="section faq-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">FAQ</p>
              <h2>Common questions</h2>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <Accordion items={faqs} />
          </FadeUp>
        </section>

        {/* ─── Final CTA ─── */}
        <ScaleIn>
          <section id="contact" className="cta">
            <div className="cta-glow" />
            <h2>Turn hesitation into revenue.</h2>
            <p>
              Install FabricVTON in under 5 minutes and let your products sell themselves.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <a className="btn btn-primary" href={INSTALL_URL}>
                Install Free on Shopify
              </a>
              <Link href="/demo" className="btn btn-demo-store">
                ✨ See it live
              </Link>
              <CalDemoButton />
            </div>
          </section>
        </ScaleIn>

      </main>
    </div>
  );
}
