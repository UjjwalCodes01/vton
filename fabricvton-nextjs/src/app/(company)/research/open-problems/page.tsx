import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand } from "../../_components/Blocks";
import PageHero from "../../_components/PageHero";
import Shell from "../../_components/Shell";
import { Arrow } from "../../_components/Arrow";
import { PROBLEMS, type Problem } from "../../_content/research";
import { postBySlug } from "../../_content/journal/meta";
import { DrapeFigure, PoseRow, StepsFigure, WarpVsAttention } from "../../_figures/Figures";
import { RESEARCH_FORM_URL } from "../../_lib/site";

export const metadata: Metadata = {
  title: "Open problems · Research",
  description:
    "The four open problems FabricVTON's research team works on: fabric fidelity through warping, drape and folds, pose and camera consistency, and fast, affordable inference.",
  alternates: { canonical: "/research/open-problems" },
};

const FIG: Record<Problem["figure"], (n: string) => React.ReactNode> = {
  warp: (n) => <WarpVsAttention n={n} />,
  drape: (n) => <DrapeFigure n={n} />,
  pose: (n) => <PoseRow n={n} />,
  steps: (n) => <StepsFigure n={n} />,
};

export default function OpenProblemsPage() {
  return (
    <Shell current="/research">
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Research", href: "/research" }, { label: "Open problems" }]}
        eyebrow="OPEN PROBLEMS"
        title="Hard, unsolved, and worth solving."
        lead="These are the problems our research team works on now. Each one is visible to a shopper in a single image, and none of them is solved by the field yet."
      />

      <section className="fv-post-body">
        <div className="fv-wrap fv-article-wrap">
          <nav className="fv-toc" aria-label="On this page">
            <p>The problems</p>
            <ol>
              {PROBLEMS.map((p) => (
                <li key={p.slug}>
                  <a href={`#${p.slug}`}>{p.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="fv-prose">
            <p>
              Virtual try-on looks like one task and behaves like four. A model has to carry every detail of the product
              across the move onto a body, make the fabric hang the way that fabric would, stay consistent from one pose
              to the next, and do all of it quickly and cheaply enough to run while someone is shopping. We treat each as
              a research problem: define it precisely, measure it on data the model has not seen, then work on it
              through experiments and ablations.
            </p>

            {PROBLEMS.map((p, i) => {
              const post = postBySlug(p.post);
              return (
                <section key={p.slug} aria-labelledby={p.slug}>
                  <h2 id={p.slug}>
                    {String(i + 1).padStart(2, "0")} · {p.title}
                  </h2>
                  <p>{p.problem}</p>
                  {FIG[p.figure](`Figure ${i + 1}`)}
                  <h3>Why it is hard</h3>
                  <ul>
                    {p.hard.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <h3>Directions we are exploring</h3>
                  <ul>
                    {p.explore.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <h3>How we measure progress</h3>
                  <ul>
                    {p.measure.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {post ? (
                    <p>
                      Read more: <a href={`/journal/${post.slug}`}>{post.title}</a>
                    </p>
                  ) : null}
                </section>
              );
            })}

            <div className="fv-callout fv-callout--p">
              <b>Want to work on these?</b>
              We are building a research team of students, researchers and engineers.{" "}
              <a href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer">
                Apply in about two minutes
              </a>{" "}
              or read about <Link href="/careers">how the team works</Link>.
            </div>
            <p>
              <Link href="/research">
                Back to research <Arrow />
              </Link>
            </p>
          </article>
        </div>
      </section>

      <CtaBand />
    </Shell>
  );
}
