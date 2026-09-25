import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "../_components/PageHero";
import Shell from "../_components/Shell";
import { CtaBand } from "../_components/Blocks";
import { POSTS, formatDate } from "../_content/journal/meta";
import { delay } from "../_lib/style";

export const metadata: Metadata = {
  title: "Journal",
  description: "Essays and field notes from FabricVTON on virtual try-on, generative vision, material intelligence, evaluation and responsible data.",
  alternates: { canonical: "/journal" },
};

export default function JournalIndex() {
  return (
    <Shell current="/journal">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Journal" }]}
        eyebrow="JOURNAL"
        title="Ideas, experiments and what we’re learning."
        lead="Essays on the problems we work on: how virtual try-on got here, what makes fabric hard, how to measure fidelity, and how to build it responsibly. Every claim about the field links to its source."
      />
      <section className="fv-block" aria-label="All posts">
        <div className="fv-wrap">
          <div className="fv-jlist">
            {POSTS.map((p, i) => (
              <a key={p.slug} className="fv-jrow" href={`/journal/${p.slug}`} data-reveal style={delay(i * 50)}>
                <span className="fv-jrow-media">
                  <Image src={p.image.src} alt="" width={p.image.width} height={p.image.height} sizes="(max-width: 899px) 120px, 220px" unoptimized />
                </span>
                <span>
                  <span className="fv-jrow-title">{p.title}</span>
                  <span className="fv-jrow-text" style={{ display: "block" }}>
                    {p.dek}
                  </span>
                </span>
                <span className="fv-jrow-meta">
                  <span>{p.topic}</span>
                  <span>{formatDate(p.date)}</span>
                  <span>{p.minutes} min read</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </Shell>
  );
}
