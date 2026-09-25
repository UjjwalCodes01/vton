import type { Metadata } from "next";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { CLOTHSY_URL, CONTACT_EMAIL, CONTACT_FORM_ID, CONTACT_MAILTO, RESEARCH_FORM_URL, SOCIALS } from "../_lib/site";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with FabricVTON about research, partnerships, Clothsy AI, press or careers.",
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  { k: "Research and partnerships", t: "Collaborations, datasets, academic work, or a problem you think we should study.", href: "#form", label: "Use the form" },
  { k: "Stores and businesses", t: "Virtual try-on for your store: installs, plans and catalogues are handled by the Clothsy AI team.", href: CLOTHSY_URL, label: "Clothsy AI", external: true },
  { k: "Join the research team", t: "Students, researchers and engineers: apply through the research-team form.", href: RESEARCH_FORM_URL, label: "Apply", external: true },
];

export default function ContactPage() {
  return (
    <Shell>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow="CONTACT"
        title="Talk to us."
        lead={
          <>
            Tell us what you are working on. For anything, you can also write to{" "}
            <a href={CONTACT_MAILTO} style={{ color: "var(--fv-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {CONTACT_EMAIL}
            </a>
            .
          </>
        }
      />

      <section className="fv-block" aria-labelledby="routes-title">
        <div className="fv-wrap">
          <h2 className="fv-eyebrow" id="routes-title" style={{ marginBottom: 24 }}>
            WHERE TO START
          </h2>
          <div className="fv-cards fv-cards--3">
            {ROUTES.map((r, i) => (
              <a
                key={r.k}
                className="fv-card"
                href={r.href}
                data-reveal
                data-magnet
                style={delay(i * 70)}
                {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <span className="fv-card-body">
                  <span className="fv-card-title">{r.k}</span>
                  <span className="fv-card-text">{r.t}</span>
                  <span className="fv-card-more">
                    {r.label} <Arrow dir={r.external ? "up" : "right"} />
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="fv-block fv-block--panel" id="form" aria-labelledby="form-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">SEND A MESSAGE</p>
            <h2 className="fv-h2" id="form-title">
              We read everything.
            </h2>
            <dl className="fv-facts" style={{ gridTemplateColumns: "1fr", marginTop: 32 }}>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
                </dd>
              </div>
              <div>
                <dt>Follow</dt>
                <dd>
                  {SOCIALS.map((s, i) => (
                    <span key={s.name}>
                      {i ? " · " : ""}
                      <a href={s.href} target="_blank" rel="noopener noreferrer">
                        {s.name}
                      </a>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
          <div className="fv-contact-form" data-reveal style={delay(80)}>
            {CONTACT_FORM_ID ? (
              <iframe
                src={`https://tally.so/embed/${CONTACT_FORM_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&source=fabricvton.com`}
                title="Contact FabricVTON"
                loading="lazy"
              />
            ) : (
              <div className="fv-contact-fallback">
                <p className="fv-lead">Write to us and we will get back to you.</p>
                <a className="fv-btn fv-btn--dark" href={CONTACT_MAILTO} data-magnet>
                  Email {CONTACT_EMAIL} <Arrow />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
