"use client";

import { motion } from "framer-motion";
import StickyHeader from "../components/StickyHeader";
import Link from "next/link";
import { FadeUp, StaggerContainer, StaggerItem } from "../components/ui/Animations";
import { Spotlight } from "../components/ui/Spotlight";

/* ── Team Data ── */
const team = [
  {
    name: "Tejasvi Kesarvani",
    role: "Founder & CEO",
    roleShort: "Founder",
    bio: "The visionary behind FabricVTON. With deep roots in e-commerce strategy and a passion for fashion-tech, Tejasvi identified the RTO crisis plaguing Shopify merchants and set out to build a solution that changes how shoppers buy clothes online.",
    photo: "/team/tejasvi.jpg",
    placeholder: "TK",
    color: "#0d9488",
  },
  {
    name: "Rudra Veer Singh Rathore",
    role: "Developer & Manager",
    roleShort: "Dev & Manager",
    bio: "Full-stack developer and the technical backbone of FabricVTON. Rudra architects robust, scalable systems and ensures every feature is shipped with quality. His Shopify store experience gives him a uniquely practical lens on every engineering decision.",
    photo: "/team/rudra.jpg",
    placeholder: "RR",
    color: "#0891b2",
  },
  {
    name: "Aaditya Singhal",
    role: "Developer & Manager",
    roleShort: "Dev & Manager",
    bio: "Aaditya bridges deep AI/ML knowledge with product intuition. He drives the try-on model pipeline and ensures the generated results feel real — from preserving fabric drape to accurate lighting. He also leads merchant onboarding and support workflows.",
    photo: "/team/aaditya.jpg",
    placeholder: "AS",
    color: "#6366f1",
  },
  {
    name: "Ujjwal Tyagi",
    role: "Developer & Manager",
    roleShort: "Dev & Manager",
    bio: "Ujjwal owns the frontend experience and product design at FabricVTON. He crafts every pixel of the widget shoppers interact with and keeps the landing page sharp. Beyond design, he manages cross-team coordination to keep everything moving fast.",
    photo: "/team/ujjwal.jpg",
    placeholder: "UT",
    color: "#f59e0b",
  },
];

/* ── Story milestones ── */
const milestones = [
  {
    year: "The Problem",
    icon: "📦",
    title: "Drowning in returns.",
    text: "As Shopify merchants and developers ourselves, we watched store owners face an invisible crisis: 30–40% of fashion orders were being returned. The culprit? Shoppers couldn't visualise how a garment would actually look on them. Refund requests, high RTO (Return-To-Origin) rates, and margins being silently destroyed — it was a systemic pain nobody was solving affordably.",
  },
  {
    year: "The Spark",
    icon: "💡",
    title: "What if customers could just… try it on?",
    text: "After one too many late-night conversations about cart abandonment metrics and return logistics nightmares, Tejasvi had a simple but powerful idea: give every shopper a virtual fitting room, right on the product page — no app, no delay, no friction. We started prototyping immediately. Our backgrounds in Shopify development meant we knew exactly where the pain was and how the ecosystem worked.",
  },
  {
    year: "The Build",
    icon: "🛠️",
    title: "Built by merchants, for merchants.",
    text: "We are a team of four from KIET Group of Institutions, united by a shared obsession with e-commerce. We spent months training AI models, stress-testing the widget on real Shopify stores, and obsessing over every millisecond of load time. The result is a tool that installs in under 5 minutes and that we ourselves would want as store operators.",
  },
  {
    year: "Today",
    icon: "🚀",
    title: "FabricVTON is live.",
    text: "We launched on the Shopify App Store with one mission: make virtual try-on accessible to every fashion brand, not just enterprise players. From boutique D2C labels to large streetwear brands, we believe every merchant deserves the conversion lift that great try-on technology provides. We are just getting started.",
  },
];

/* ── Animation variants ── */
const heroVariants: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const heroChild: any = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export default function AboutPage() {
  return (
    <div className="landing-shell">
      <div className="bg-glow bg-glow-one" />
      <div className="bg-glow bg-glow-two" />

      <StickyHeader />

      <main className="container main-content">

        {/* ── Hero ── */}
        <section className="hero about-hero">
          <Spotlight className="hero-spotlight" fill="rgba(13,148,136,0.08)" />
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="about-hero-inner"
          >
            <motion.p variants={heroChild} className="eyebrow">Our Story</motion.p>
            <motion.h1 variants={heroChild}>
              We were Shopify merchants{" "}
              <span>before we were founders.</span>
            </motion.h1>
            <motion.p variants={heroChild} className="hero-copy about-hero-copy">
              FabricVTON was born from a very real frustration — watching great fashion brands lose revenue to returns that never needed to happen in the first place.
            </motion.p>
            <motion.div variants={heroChild} className="about-hero-cta">
              <Link href="/" className="btn btn-primary">Back to Home</Link>
              <a
                href="mailto:fabricvton@gmail.com"
                className="btn btn-demo-store"
              >
                Get in Touch
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Our Story Timeline ── */}
        <section className="section about-story-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">Our Journey</p>
              <h2>From Shopify pain points to product.</h2>
              <p className="hero-copy" style={{ marginBottom: 0 }}>
                The story of how lived experience in e-commerce led us to build the virtual fitting room we always wished existed.
              </p>
            </div>
          </FadeUp>

          <div className="about-timeline">
            {milestones.map((m, i) => (
              <FadeUp key={m.year} delay={i * 0.08}>
                <div className={`about-milestone ${i % 2 === 0 ? "milestone-left" : "milestone-right"}`}>
                  <div className="milestone-icon-col">
                    <div className="milestone-icon-wrap">
                      <span className="milestone-icon">{m.icon}</span>
                    </div>
                    {i < milestones.length - 1 && <div className="milestone-connector" />}
                  </div>
                  <div className="milestone-content">
                    <span className="milestone-year">{m.year}</span>
                    <h3>{m.title}</h3>
                    <p>{m.text}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Mission Statement ── */}
        <section className="section about-mission-section">
          <FadeUp>
            <div className="about-mission-card">
              <div className="about-mission-glow" />
              <p className="faq-subtitle">Our Mission</p>
              <blockquote className="about-mission-quote">
                "Make virtual try-on so accessible and so good that every fashion shopper buys with confidence — and every merchant stops dreading returns day."
              </blockquote>
              <p className="about-mission-sub">
                We believe the gap between online browsing and confident buying is a problem AI can solve right now — and we have built our company around proving it.
              </p>
            </div>
          </FadeUp>
        </section>

        {/* ── Team ── */}
        <section className="section about-team-section">
          <FadeUp>
            <div className="faq-header">
              <p className="faq-subtitle">The Team</p>
              <h2>Meet the people behind FabricVTON.</h2>
              <p className="hero-copy" style={{ marginBottom: 0 }}>
                Four builders united by a shared obsession: helping fashion brands grow without the returns headache.
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="about-team-grid" staggerDelay={0.1}>
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="about-team-card">
                  {/* Photo / Avatar */}
                  <div className="about-team-photo-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="about-team-photo"
                      onError={(e) => {
                        // fallback to placeholder initials avatar
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const sibling = target.nextElementSibling as HTMLElement | null;
                        if (sibling) sibling.style.display = "flex";
                      }}
                    />
                    <div
                      className="about-team-avatar-fallback"
                      style={{ background: `${member.color}18`, color: member.color, borderColor: `${member.color}30` }}
                    >
                      {member.placeholder}
                    </div>
                    {/* Accent ring */}
                    <div className="about-team-photo-ring" style={{ borderColor: `${member.color}40` }} />
                  </div>

                  {/* Info */}
                  <div className="about-team-info">
                    <div className="about-team-role-badge" style={{ color: member.color, background: `${member.color}14` }}>
                      {member.roleShort}
                    </div>
                    <h3 className="about-team-name">{member.name}</h3>
                    <p className="about-team-role-full">{member.role}</p>
                    <p className="about-team-bio">{member.bio}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ── Contact / Connect ── */}
        <section className="section about-connect-section">
          <FadeUp>
            <div className="about-connect-card">
              <div className="about-connect-glow" />
              <h2>Say hello.</h2>
              <p>Whether you are a merchant wanting to try our app, a brand interested in partnering, or just curious — we would love to hear from you.</p>
              <div className="about-connect-links">
                <a href="mailto:fabricvton@gmail.com" className="about-connect-link" id="contact-email">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  fabricvton@gmail.com
                </a>
                <a href="https://www.instagram.com/fabricvton/" target="_blank" rel="noopener noreferrer" className="about-connect-link" id="contact-instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                  @fabricvton
                </a>
                <a href="https://x.com/fabricvton93490" target="_blank" rel="noopener noreferrer" className="about-connect-link" id="contact-twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  @fabricvton93490
                </a>
              </div>
            </div>
          </FadeUp>
        </section>

      </main>
    </div>
  );
}
