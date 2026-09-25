import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Card, CtaBand, RefList } from "../../_components/Blocks";
import PageHero from "../../_components/PageHero";
import Shell from "../../_components/Shell";
import { AREAS } from "../../_content/research";
import { POSTS, formatDate } from "../../_content/journal/meta";
import { DrapeFigure, FabricFour, PoseRow, TryOnTask, WarpVsAttention } from "../../_figures/Figures";

export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = AREAS.find((a) => a.slug === slug);
  if (!area) return {};
  return { title: `${area.title} · Research`, description: `${area.short} ${area.lead}`, alternates: { canonical: `/research/${area.slug}` } };
}

const FIGURES: Record<string, React.ReactNode> = {
  "visual-understanding": <TryOnTask n="Figure" />,
  "generative-vision": <WarpVsAttention n="Figure" />,
  "material-intelligence": <FabricFour n="Figure" />,
  "human-object-interaction": <PoseRow n="Figure" />,
};

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = AREAS.find((a) => a.slug === slug);
  if (!area) notFound();
  const index = AREAS.indexOf(area);
  const next = AREAS[(index + 1) % AREAS.length];
  const posts = area.posts.map((s) => POSTS.find((p) => p.slug === s)).filter((p) => p !== undefined);

  return (
    <Shell current="/research">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Research", href: "/research" }, { label: area.title }]}
        eyebrow={`RESEARCH AREA ${area.no}`}
        title={area.title}
        lead={area.short}
      >
        <div className="fv-area-art">
          <Image src={area.image.src} alt="" width={area.image.width} height={area.image.height} sizes="460px" unoptimized priority />
        </div>
      </PageHero>

      <section className="fv-post-body">
        <div className="fv-wrap fv-article-wrap fv-article-wrap--solo">
          <article className="fv-prose">
            <p className="fv-statement" style={{ maxWidth: "none", fontSize: "clamp(1.5rem, 1rem + 1.6vw, 2.25rem)" }}>
              {area.lead}
            </p>
            {area.body.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            {FIGURES[area.slug]}
            {area.slug === "material-intelligence" ? <DrapeFigure n="Figure" /> : null}

            <h2 id="questions">Questions we are exploring</h2>
            <ol>
              {area.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>

            <RefList keys={area.reading} title="Further reading" />
          </article>
        </div>
      </section>

      {posts.length ? (
        <section className="fv-block fv-block--panel" aria-labelledby="area-posts">
          <div className="fv-wrap">
            <div className="fv-block-head">
              <div data-reveal>
                <p className="fv-eyebrow">FROM THE JOURNAL</p>
                <h2 className="fv-h2" id="area-posts">
                  Related writing.
                </h2>
              </div>
            </div>
            <div className="fv-cards">
              {posts.map((p, i) => (
                <Card
                  key={p.slug}
                  i={i}
                  card={{ href: `/journal/${p.slug}`, image: p.image, meta: `${p.topic} · ${formatDate(p.date)}`, title: p.title, text: p.dek, more: "Read" }}
                />
              ))}
            </div>
            <p style={{ marginTop: 40 }} data-reveal>
              <a className="fv-link" href={`/research/${next.slug}`} data-magnet>
                Next area: {next.title} →
              </a>
            </p>
          </div>
        </section>
      ) : null}

      <CtaBand />
    </Shell>
  );
}
