"use client";

import { useState } from "react";
import Image from "next/image";
import StickyHeader from "../components/StickyHeader";
import CalDemoButton from "../components/CalDemoButton";
import { TGM_PRODUCTS, TGM_STATS, TGM_STEPS, type TgmProduct } from "./data";

function TgmHero() {
  return (
    <section className="tgm-hero container">
      <div className="tgm-collab-badge">
        <span className="tgm-collab-dot" />
        <span>The Giving Movement</span>
        <span className="tgm-collab-sep">&times;</span>
        <span className="tgm-collab-fv">FabricVTON AI</span>
      </div>

      <h1 className="tgm-hero-title">
        Your Products.
        <br />
        <span className="tgm-gradient-text">On Real People.</span>
      </h1>
      <p className="tgm-hero-sub">
        Here&apos;s exactly what FabricVTON generates for The Giving Movement
        &mdash; a single product photo transformed into a photorealistic model
        try-on, automatically.
      </p>
    </section>
  );
}

function TgmLookSelector(props: {
  activeIdx: number;
  onSelect: (index: number) => void;
}) {
  const { activeIdx, onSelect } = props;

  return (
    <div className="tgm-look-nav container">
      {TGM_PRODUCTS.map((product, index) => (
        <button
          key={product.id}
          className={`tgm-look-btn ${index === activeIdx ? "active" : ""}`}
          onClick={() => onSelect(index)}
        >
          <div className="tgm-look-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.productUrl}
              alt={product.sku}
              className="tgm-look-thumb"
            />
            {index === activeIdx && <div className="tgm-look-thumb-ring" />}
          </div>
          <div className="tgm-look-btn-text">
            <span className="tgm-look-label">{product.label}</span>
            <span className="tgm-look-sku">{product.sku}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function TgmSourceRow({ product }: { product: TgmProduct }) {
  return (
    <div className="tgm-source-row">
      <div className="tgm-source-card">
        <div className="tgm-source-tag">Source Product Photo</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.productUrl} alt={product.sku} className="tgm-source-img" />
      </div>

      <div className="tgm-arrow-col">
        <div className="tgm-arrow-track">
          <svg width="100%" height="2" viewBox="0 0 200 2" preserveAspectRatio="none">
            <line
              x1="0"
              y1="1"
              x2="200"
              y2="1"
              stroke="url(#arrowGrad)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <defs>
              <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#0d9488" stopOpacity="1" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <div className="tgm-ai-pill">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z"
                fill="white"
              />
            </svg>
            FabricVTON AI
          </div>
        </div>
        <svg
          className="tgm-arrow-chevron"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="#0d9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="tgm-desc-card">
        <div className="tgm-look-chip">{product.label}</div>
        <h2 className="tgm-desc-sku">{product.sku}</h2>

        <div className="tgm-results-row">
          {TGM_STATS.map((stat, index) => (
            <div key={stat.label} style={{ display: "contents" }}>
              <div className="tgm-result-item">
                <span className="tgm-result-val">{stat.value}</span>
                <span className="tgm-result-label">{stat.label}</span>
              </div>
              {index < TGM_STATS.length - 1 && <div className="tgm-result-divider" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TgmComposite({ product }: { product: TgmProduct }) {
  return (
    <div className="tgm-composite-wrap">
      <div className="tgm-composite-header">
        <div className="tgm-composite-tag-left">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect
              x="1"
              y="1"
              width="6"
              height="6"
              rx="1.5"
              stroke="#64748b"
              strokeWidth="1.5"
            />
          </svg>
          Before (original outfit)
        </div>
        <div className="tgm-composite-center-label">
          <span>FabricVTON Result</span>
        </div>
        <div className="tgm-composite-tag-right">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3" fill="#0d9488" />
          </svg>
          After (AI try-on)
        </div>
      </div>

      <div className="tgm-composite-frame">
        <Image
          key={product.compositeUrl}
          src={product.compositeUrl}
          alt={`${product.sku} before vs after try-on`}
          width={1200}
          height={675}
          className="tgm-composite-img"
          priority
        />
        <div className="tgm-composite-midline" />
      </div>

      <p className="tgm-composite-caption">
        Left: Model wearing their own garment &nbsp;&middot;&nbsp; Right:
        FabricVTON AI-generated try-on of TGM product
      </p>
    </div>
  );
}

function TgmHowItWorks() {
  return (
    <section className="tgm-how container">
      <div className="tgm-how-inner">
        <h3 className="tgm-how-title">How This Was Generated</h3>
        <div className="tgm-how-steps">
          {TGM_STEPS.map((step) => (
            <div key={step.n} className="tgm-how-step">
              <div className="tgm-how-num">{step.n}</div>
              <div className="tgm-how-icon">{step.icon}</div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TgmCallToAction() {
  return (
    <section className="tgm-cta-section container">
      <div className="tgm-cta-card">
        <div className="tgm-cta-left">
          <div className="tgm-cta-eyebrow">Ready to go live?</div>
          <h3 className="tgm-cta-title">
            Add FabricVTON to The Giving Movement store
          </h3>
          <p className="tgm-cta-body">
            What you&apos;ve seen above is exactly what your shoppers will
            experience &mdash; live on your product pages in under 10 minutes.
          </p>
        </div>
        <div className="tgm-cta-actions">
          <CalDemoButton className="tgm-btn-primary" label="Book a 15-min Call" />
          <a href="mailto:sales@fabricvton.com" className="tgm-btn-secondary">
            Mail Us
          </a>
        </div>
      </div>
    </section>
  );
}

export default function TGMPageClient() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeProduct = TGM_PRODUCTS[activeIdx];

  return (
    <>
      <StickyHeader />
      <main className="tgm-shell">
        <div className="tgm-glow tgm-glow-1" />
        <div className="tgm-glow tgm-glow-2" />

        <TgmHero />
        <TgmLookSelector activeIdx={activeIdx} onSelect={setActiveIdx} />

        <section className="tgm-showcase container">
          <TgmSourceRow product={activeProduct} />
          <TgmComposite product={activeProduct} />
        </section>

        <TgmHowItWorks />
        <TgmCallToAction />
      </main>
    </>
  );
}
