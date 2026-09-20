"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkle } from "../components/icons";

type Plan = {
  name: string;
  for: string;
  price: string;
  period: string;
  stats: { value: string; label: string }[];
  cta: string;
  featured?: boolean;
  included: string[];
};

const appPlans: Plan[] = [
  {
    name: "Basic",
    for: "For individuals getting started",
    price: "$19",
    period: "/month",
    stats: [
      { value: "200", label: "credits/month" },
      { value: "720p", label: "image quality" },
      { value: "2", label: "saved looks" },
    ],
    cta: "Start Basic",
    included: [
      "AI outfit and fashion editing tools",
      "Image upscaling and high-quality export",
      "Access to ready-to-use templates",
      "Standard processing speed",
      "Up to 3 simultaneous generations",
      "Email support",
    ],
  },
  {
    name: "Pro",
    for: "For creators producing every day",
    price: "$49",
    period: "/month",
    featured: true,
    stats: [
      { value: "750 + 50", label: "credits/month" },
      { value: "1080p", label: "image quality" },
      { value: "5", label: "saved looks" },
    ],
    cta: "Start Pro",
    included: [
      "Everything in Basic",
      "Faster credits that never expire",
      "More realistic AI image generation",
      "Custom background and scene generation",
      "Up to 6 simultaneous generations",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    for: "For high-volume creative teams",
    price: "$99",
    period: "/month",
    stats: [
      { value: "1,500 + 100", label: "credits/month" },
      { value: "1080p", label: "image quality" },
      { value: "10", label: "saved looks" },
    ],
    cta: "Start Agency",
    included: [
      "Everything in Pro",
      "Branding and white-label options",
      "Bulk generation and API access",
      "Dedicated account manager",
      "Advanced customization controls",
      "Priority feature requests",
    ],
  },
];

export default function PlanSwitcher() {
  const [tab, setTab] = useState<"app" | "api">("app");

  return (
    <>
      <div className="plan-switch" role="tablist" aria-label="Pricing type">
        <div className="plan-switch-inner">
          <button
            type="button"
            role="tab"
            id="tab-app"
            aria-selected={tab === "app"}
            aria-controls="panel-app"
            onClick={() => setTab("app")}
          >
            App
          </button>
          <button
            type="button"
            role="tab"
            id="tab-api"
            aria-selected={tab === "api"}
            aria-controls="panel-api"
            onClick={() => setTab("api")}
          >
            {"</>"} Developer API
          </button>
        </div>
      </div>

      {tab === "app" ? (
        <div id="panel-app" role="tabpanel" aria-labelledby="tab-app">
          <div className="plan-meta">
            <span className="currency">🇺🇸 USD</span>
          </div>

          <div className="plan-grid">
            {appPlans.map((plan) => (
              <article className={`plan${plan.featured ? " is-featured" : ""}`} key={plan.name}>
                <div className="plan-head">
                  <span className="plan-name">{plan.name}</span>
                  {plan.featured ? (
                    <span className="best-value">
                      <Sparkle /> BEST VALUE
                    </span>
                  ) : null}
                </div>
                <p className="plan-for">{plan.for}</p>

                <div className="plan-price">
                  <b>{plan.price}</b>
                  <span>{plan.period}</span>
                </div>

                <div className="plan-stats">
                  {plan.stats.map((stat) => (
                    <div key={stat.label}>
                      <b>{stat.value}</b>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>

                <Link className={`btn ${plan.featured ? "btn-dark" : "btn-ghost"}`} href="#start">
                  {plan.cta} <ArrowRight className="btn-arrow" />
                </Link>

                <p className="plan-included">WHAT’S INCLUDED</p>
                <ul className="plan-list">
                  {plan.included.map((item) => (
                    <li key={item}>
                      <Check />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div id="panel-api" role="tabpanel" aria-labelledby="tab-api">
          <div className="api-panel">
            <div>
              <p className="eyebrow eyebrow-violet">Developer API</p>
              <h3 className="display">Built for volume.</h3>
              <p className="lede">
                Generate try-ons straight from your own storefront, PIM or app. API access is included
                on the Agency plan, and available on its own for higher volumes — we price it on the
                number of generations you expect each month.
              </p>
              <ul className="plan-list api-list">
                <li>
                  <Check />
                  REST endpoints for generation and status
                </li>
                <li>
                  <Check />
                  Webhooks for finished try-ons
                </li>
                <li>
                  <Check />
                  Bulk jobs and per-key usage reporting
                </li>
                <li>
                  <Check />
                  Sandbox keys for testing
                </li>
              </ul>
              <div className="cta-actions">
                <Link className="btn btn-violet" href="#contact">
                  Talk to us <ArrowRight className="btn-arrow" />
                </Link>
                <Link className="btn btn-ghost" href="#docs">
                  Read the docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
