import Link from "next/link";
import type { Metadata } from "next";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { PROBLEMS } from "../_content/research";
import { CONTACT_HREF, RESEARCH_FORM_URL } from "../_lib/site";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Careers · Research team",
  description:
    "Join FabricVTON's virtual try-on research team: students, researchers and engineers working on fabric fidelity, drape, pose consistency and fast inference.",
  alternates: { canonical: "/careers" },
};

const WHO = [
  "Undergraduate and master’s students",
  "PhD students and research scholars",
  "Working engineers and researchers",
  "Independent researchers",
  "People between roles or taking a break",
];

const SKILLS = [
  { k: "Generative models", t: "Diffusion models, conditioning, attention, training at scale." },
  { k: "Computer vision", t: "Pose, parsing, segmentation, dense correspondence." },
  { k: "Graphics and materials", t: "Cloth simulation, reflectance, rendering, 3D garments." },
  { k: "Evaluation", t: "Metrics, benchmarks, human studies, careful experiment design." },
  { k: "Efficient inference", t: "Distillation, quantisation, serving under real traffic." },
  { k: "Data", t: "Pipelines, annotation, provenance and licensing." },
];

const STEPS = [
  { title: "Apply", text: "A short form: your background, what you have built, and links to your LinkedIn, GitHub and any papers or portfolio. It takes about two minutes." },
  { title: "We read it", text: "Every application is read by a person, and every strong answer gets a reply." },
  { title: "Talk about a problem", text: "If there is a fit, we talk about the open problem you would most want to work on and how you would approach it." },
];

export default function CareersPage() {
  return (
    <Shell current="/careers">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}
        eyebrow="CAREERS"
        title="Join the virtual try‑on research team."
        lead="We are building a research team at FabricVTON. The work feeds directly into our try-on engine, which generates photorealistic images of a person wearing a garment they have never physically worn."
      >
        <div className="fv-band" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <p className="fv-eyebrow">NOW BUILDING</p>
            <h2>Research team</h2>
            <p>Students, researchers and engineers. Apply in about two minutes.</p>
          </div>
          <div className="fv-actions">
            <a className="fv-btn fv-btn--dark" href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer" data-magnet>
              Apply now <Arrow dir="up" />
            </a>
          </div>
        </div>
      </PageHero>

      <section className="fv-block" aria-labelledby="work-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">THE WORK</p>
            <h2 className="fv-h2" id="work-title">
              Real research, shipped in production.
            </h2>
            <p className="fv-body" style={{ marginTop: 20 }}>
              We work on these problems as research: proper experiments, ablations and benchmarks, and we aim to publish
              what we learn. The same work ships inside our product, so you see it used.
            </p>
            <Link className="fv-textlink" href="/research/open-problems" data-magnet>
              Read the problem statements <Arrow />
            </Link>
          </div>
          <ol className="fv-rules">
            {PROBLEMS.map((p, i) => (
              <li key={p.slug} data-reveal style={delay(i * 60)}>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="fv-block fv-block--panel" aria-labelledby="who-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">WHO WE ARE LOOKING FOR</p>
              <h2 className="fv-h2" id="who-title">
                Curious, rigorous, and honest about results.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              There is no single profile. What matters is that you can take a hard, vague problem, make it precise, and
              tell the truth about what worked.
            </p>
          </div>
          <div className="fv-two">
            <div data-reveal>
              <h3 className="fv-h3">You might be</h3>
              <ul className="fv-bullets" style={{ marginTop: 18 }}>
                {WHO.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <dl className="fv-facts" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {SKILLS.map((s, i) => (
                <div key={s.k} data-reveal style={delay(i * 50)}>
                  <dt>{s.k}</dt>
                  <dd>{s.t}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="fv-body" style={{ marginTop: 28 }} data-reveal>
            Experience in any of these helps. None of them is required.
          </p>
        </div>
      </section>

      <section className="fv-block" aria-labelledby="how-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">HOW TO APPLY</p>
            <h2 className="fv-h2" id="how-title">
              Three steps.
            </h2>
          </div>
          <div>
            <ol className="fv-rules">
              {STEPS.map((s, i) => (
                <li key={s.title} data-reveal style={delay(i * 60)}>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="fv-actions" data-reveal>
              <a className="fv-btn fv-btn--dark" href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer" data-magnet>
                Apply to the research team <Arrow dir="up" />
              </a>
              <a className="fv-btn fv-btn--soft" href={CONTACT_HREF} data-magnet>
                Ask a question
              </a>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
