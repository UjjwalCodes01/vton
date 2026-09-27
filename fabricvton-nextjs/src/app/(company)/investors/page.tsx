import Link from "next/link";
import type { Metadata } from "next";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import TallyEmbed from "../_components/TallyEmbed";
import { Arrow } from "../_components/Arrow";
import { CLOTHSY_URL, CONTACT_EMAIL, CONTACT_MAILTO, INVESTOR_FORM_ID } from "../_lib/site";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Investors",
  description:
    "Investor enquiries for FabricVTON, the AI research company behind Clothsy AI. Request the deck, a demo or an intro call with the founders.",
  alternates: { canonical: "/investors" },
};

const WHY = [
  {
    k: "Research first",
    t: "We run our own try-on model and publish the open problems we are working on: fabric fidelity, drape, pose consistency and speed.",
    href: "/research/open-problems",
    label: "Open problems",
  },
  {
    k: "Already in stores",
    t: "Our research ships as Clothsy AI, virtual try-on for Shopify and WooCommerce stores.",
    href: CLOTHSY_URL,
    label: "Clothsy AI",
    external: true,
  },
  {
    k: "A problem worth solving",
    t: "Shoppers buy clothes they have never touched, and much of it goes back. Try-on that stays true to the garment is how we want to change that.",
    href: "/company",
    label: "Our vision",
  },
];

export default function InvestorsPage() {
  return (
    <Shell>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Investors" }]}
        eyebrow="INVESTORS"
        title="Invest in FabricVTON."
        lead="We are an AI research company building virtual try-on that stays true to the garment, and shipping it to stores through Clothsy AI. If you back research-led companies, we would like to hear from you."
      >
        <div className="fv-band" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <p className="fv-eyebrow">TALK TO THE FOUNDERS</p>
            <h2>Deck, demo or a call</h2>
            <p>Tell us about you in about two minutes. A founder replies from {CONTACT_EMAIL}.</p>
          </div>
          <div className="fv-actions">
            <a className="fv-btn fv-btn--dark" href="#form" data-magnet>
              Start here <Arrow />
            </a>
          </div>
        </div>
      </PageHero>

      <section className="fv-block" aria-labelledby="why-title">
        <div className="fv-wrap">
          <h2 className="fv-eyebrow" id="why-title" style={{ marginBottom: 24 }}>
            WHY FABRICVTON
          </h2>
          <div className="fv-cards fv-cards--3">
            {WHY.map((r, i) =>
              r.external ? (
                <a key={r.k} className="fv-card" href={r.href} target="_blank" rel="noopener noreferrer" data-reveal data-magnet style={delay(i * 70)}>
                  <span className="fv-card-body">
                    <span className="fv-card-title">{r.k}</span>
                    <span className="fv-card-text">{r.t}</span>
                    <span className="fv-card-more">
                      {r.label} <Arrow dir="up" />
                    </span>
                  </span>
                </a>
              ) : (
                <Link key={r.k} className="fv-card" href={r.href} data-reveal data-magnet style={delay(i * 70)}>
                  <span className="fv-card-body">
                    <span className="fv-card-title">{r.k}</span>
                    <span className="fv-card-text">{r.t}</span>
                    <span className="fv-card-more">
                      {r.label} <Arrow />
                    </span>
                  </span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="fv-block fv-block--panel" id="form" aria-labelledby="form-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">INVESTOR ENQUIRIES</p>
            <h2 className="fv-h2" id="form-title">
              Tell us about you.
            </h2>
            <p className="fv-body" style={{ marginTop: 20 }}>
              Venture funds, angels, accelerators and strategic investors are all welcome. We read every enquiry and
              reply personally.
            </p>
            <dl className="fv-facts" style={{ gridTemplateColumns: "1fr", marginTop: 32 }}>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
                </dd>
              </div>
              <div>
                <dt>What we can share</dt>
                <dd>The pitch deck, a product demo, and an intro call with the founders.</dd>
              </div>
            </dl>
            <p className="fv-body" style={{ marginTop: 28, fontSize: 13 }}>
              This page is for enquiries only and is not an offer to sell, or a solicitation of an offer to buy, any
              securities.
            </p>
          </div>
          <div className="fv-contact-form" data-reveal style={delay(80)}>
            <TallyEmbed formId={INVESTOR_FORM_ID} title="Investor enquiries" source="fabricvton.com-investors" />
          </div>
        </div>
      </section>
    </Shell>
  );
}
