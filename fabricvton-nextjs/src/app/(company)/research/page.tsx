import Link from "next/link";
import type { Metadata } from "next";
import { Card, CtaBand } from "../_components/Blocks";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { AREAS, METHOD, PROBLEMS, RESPONSIBILITY } from "../_content/research";
import { POSTS, formatDate } from "../_content/journal/meta";
import { ProvenanceFlow, TryOnTask } from "../_figures/Figures";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Research",
  description:
    "FabricVTON researches visual understanding, generative vision, material intelligence and human–object interaction, starting with photorealistic virtual try-on.",
  alternates: { canonical: "/research" },
};

export default function ResearchPage() {
  return (
    <Shell current="/research">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Research" }]}
        eyebrow="RESEARCH"
        title="We work on problems where vision meets reality."
        lead="Generative models can make almost any image look plausible. We study what it takes to make them faithful: to people, to materials and to the physical world. Our first focus is photorealistic virtual try-on."
      />

      {/* the core task */}
      <section className="fv-block">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">THE CORE PROBLEM</p>
            <h2 className="fv-h2">Show a person wearing something they have never worn.</h2>
          </div>
          <div className="fv-stack" data-reveal style={delay(80)}>
            <p className="fv-lead">
              From one photo of a person and one photo of a product, generate an image of that person wearing that
              product. It sounds like one task. It is really several: understanding the photo, moving the garment onto a
              body, preserving every detail of the fabric, and doing it fast enough to use.
            </p>
            <p className="fv-body">
              Each of those pieces is an open research question, and each maps to one of our research areas below.
            </p>
          </div>
        </div>
        <div className="fv-wrap" style={{ marginTop: "clamp(40px, 6vw, 72px)" }} data-reveal>
          <TryOnTask />
        </div>
      </section>

      {/* areas */}
      <section className="fv-block fv-block--panel" aria-labelledby="areas-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">RESEARCH AREAS</p>
              <h2 className="fv-h2" id="areas-title">
                Four areas, one goal.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              Visual AI that understands structure, materials, people and the ways they interact, so that what it
              generates is true to the real thing.
            </p>
          </div>
          <div className="fv-cards fv-cards--4">
            {AREAS.map((a, i) => (
              <Card
                key={a.slug}
                i={i}
                card={{ href: `/research/${a.slug}`, image: a.image, meta: a.no, title: a.title, text: a.short, more: "Explore this area" }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* open problems */}
      <section className="fv-block" aria-labelledby="problems-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">OPEN PROBLEMS</p>
            <h2 className="fv-h2" id="problems-title">
              What we are working on now.
            </h2>
            <Link className="fv-textlink" href="/research/open-problems" data-magnet>
              Read the full problem statements <Arrow />
            </Link>
          </div>
          <ol className="fv-rules">
            {PROBLEMS.map((p, i) => (
              <li key={p.slug} data-reveal style={delay(i * 60)}>
                <div>
                  <a className="fv-rule-title" href={`/research/open-problems#${p.slug}`}>
                    {p.title}
                  </a>
                  <p>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* method */}
      <section className="fv-dark fv-block fv-block--dark" aria-labelledby="method-title">
        <div className="fv-wrap fv-two">
          <div data-reveal>
            <p className="fv-eyebrow">HOW WE WORK</p>
            <h2 className="fv-h2" id="method-title">
              Measured before it is shipped.
            </h2>
          </div>
          <ol className="fv-rules fv-rules--dark">
            {METHOD.map((m, i) => (
              <li key={m.title} data-reveal style={delay(i * 60)}>
                <div>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* responsibility */}
      <section className="fv-block fv-block--beige" aria-labelledby="resp-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">DATA AND RESPONSIBILITY</p>
              <h2 className="fv-h2" id="resp-title">
                Where the data comes from matters.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              Most public try-on datasets are licensed for research only. A model that people and businesses can rely on
              has to be built on data with clear rights and clear consent.
            </p>
          </div>
          <div data-reveal>
            <ProvenanceFlow n="Figure 2" />
          </div>
          <dl className="fv-facts fv-facts--4">
            {RESPONSIBILITY.map((r, i) => (
              <div key={r.title} data-reveal style={delay(i * 60)}>
                <dt>{r.title}</dt>
                <dd>{r.text}</dd>
              </div>
            ))}
          </dl>
          <Link className="fv-textlink" href="/journal/where-training-data-comes-from" data-magnet>
            Read: Where training data comes from <Arrow />
          </Link>
        </div>
      </section>

      {/* journal */}
      <section className="fv-block" aria-labelledby="latest-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">FROM THE JOURNAL</p>
              <h2 className="fv-h2" id="latest-title">
                Notes from the work.
              </h2>
            </div>
            <div data-reveal style={delay(80)}>
              <Link className="fv-link" href="/journal" data-magnet>
                All posts <Arrow />
              </Link>
            </div>
          </div>
          <div className="fv-cards fv-cards--3">
            {POSTS.slice(0, 3).map((p, i) => (
              <Card
                key={p.slug}
                i={i}
                card={{ href: `/journal/${p.slug}`, image: p.image, meta: `${p.topic} · ${formatDate(p.date)}`, title: p.title, text: p.dek, more: "Read" }}
              />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </Shell>
  );
}
