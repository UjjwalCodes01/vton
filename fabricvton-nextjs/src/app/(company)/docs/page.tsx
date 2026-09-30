import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Shell from "../_components/Shell";
import { Arrow } from "../_components/Arrow";
import { CtaBand } from "../_components/Blocks";
import { delay } from "../_lib/style";
import CountUp from "./_components/CountUp";
import { LoopFigure, SystemFigure, TracksFigure } from "./_components/figures";
import { CHAPTERS, DOCS_VERSION } from "./_data/chapters";
import { DOC_REF_COUNT } from "./_data/refs";
import "./docs.css";

export const metadata: Metadata = {
  title: "Docs · Research programme",
  description:
    "FabricVTON's research programme, in full: live virtual try-on for every garment and every body. The problem, the state of the art, the technical approach, the roadmap and the expected outputs.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Live virtual try-on for every garment and every body",
    description: "An eighteen-month research programme to build photorealistic try-on for any garment and every shopper, first in photos and then in live video.",
    url: "/docs",
  },
};

const STATS = [
  { v: 18, k: "months", t: "in seven phases" },
  { v: 7, k: "work packages", t: "image, video, live and measurement" },
  { v: 15, k: "milestones", t: "each with its evidence" },
  { v: 4, k: "papers", t: "plus an optional cost report" },
  { v: 2000, k: "benchmark pairs", t: "at least, across 8+ garment families", suffix: "+" },
  { v: DOC_REF_COUNT, k: "sources", t: "papers, model cards and licences" },
];

export default function DocsHome() {
  return (
    <Shell current="/docs">
      <header className="dx-cover" data-progress="hero">
        <div className="dx-cover-bg" aria-hidden="true">
          <Image src="/brand/drape-light.webp" alt="" fill sizes="100vw" priority unoptimized />
        </div>
        <div className="fv-wrap dx-cover-grid">
          <div className="dx-cover-copy">
            <nav className="fv-crumbs" aria-label="Breadcrumb" data-reveal>
              <ol>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <span aria-current="page">Docs</span>
                </li>
              </ol>
            </nav>
            <p className="fv-eyebrow" data-reveal style={delay(60)}>
              FABRICVTON · RESEARCH PROGRAMME
            </p>
            <h1 className="dx-cover-title" data-reveal style={delay(120)}>
              Live virtual try-on <em>for every garment and every body.</em>
            </h1>
            <p className="dx-cover-lead" data-reveal style={delay(200)}>
              An eighteen-month research and development programme to build photorealistic virtual try-on for any garment and
              every shopper, first in photos and then in live video, the programme&apos;s end goal.
            </p>
            <div className="fv-actions dx-cover-actions" data-reveal style={delay(280)}>
              <Link className="fv-btn fv-btn--dark" href="/docs/summary" data-magnet>
                Start reading <Arrow />
              </Link>
              <Link className="fv-btn fv-btn--soft" href="/docs/video-and-live-models">
                How live try-on works
              </Link>
            </div>
            <p className="dx-cover-meta" data-reveal style={delay(340)}>
              <span>{DOCS_VERSION}</span>
              <span>Public edition</span>
              <span>{CHAPTERS.length} chapters</span>
            </p>
          </div>
          <div className="dx-orbit" aria-hidden="true" data-reveal style={delay(200)}>
            <span className="dx-orbit-ring dx-orbit-ring--1" />
            <span className="dx-orbit-ring dx-orbit-ring--2" />
            <span className="dx-orbit-ring dx-orbit-ring--3" />
            <span className="dx-orbit-core">
              <Image src="/brand/mark-merged.webp" alt="" width={120} height={120} style={{ width: "100%", height: "auto" }} unoptimized />
            </span>
            <span className="dx-orbit-spin dx-orbit-spin--1">
              <b>Photo</b>
            </span>
            <span className="dx-orbit-spin dx-orbit-spin--2">
              <b>Video</b>
            </span>
            <span className="dx-orbit-spin dx-orbit-spin--3">
              <b>Live · 33 ms</b>
            </span>
          </div>
        </div>
      </header>

      <section className="fv-block dx-stats-block" aria-label="The programme in numbers">
        <div className="fv-wrap">
          <dl className="dx-stats">
            {STATS.map((s, i) => (
              <div key={s.k} data-reveal style={delay(i * 70)}>
                <dt>
                  <CountUp to={s.v} suffix={s.suffix} />
                </dt>
                <dd>
                  <b>{s.k}</b>
                  <span>{s.t}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="fv-block fv-block--panel" aria-labelledby="goal-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">TWO TRACKS, ONE GOAL</p>
              <h2 className="fv-h2" id="goal-title">
                Image first, because the image model teaches the video model.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              The benchmark comes first, so every decision is measured across garments, photos and bodies. The image model
              then re-dresses real, consented clips to train video, and the video model becomes the teacher for a live student.
            </p>
          </div>
          <TracksFigure />
        </div>
      </section>

      <section className="fv-block" aria-labelledby="system-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">THE SYSTEM</p>
              <h2 className="fv-h2" id="system-title">
                Seven work packages, three tracks.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              Licensed data becomes a servable image model; the image model teaches video and live; a measurement track scores
              every checkpoint in both.
            </p>
          </div>
          <SystemFigure n="Figure 1" />
        </div>
      </section>

      <section className="fv-block fv-block--panel" aria-labelledby="chapters-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">READ THE DOCS</p>
              <h2 className="fv-h2" id="chapters-title">
                Every chapter of the proposal.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              From the problem and a review of the state of the art to the work packages, roadmap, budget and expected outputs.
              Every figure is cited to its source.
            </p>
          </div>
          <div className="dx-chapters">
            {CHAPTERS.map((c, i) => (
              <Link key={c.slug} href={`/docs/${c.slug}`} className="dx-chapter" data-reveal style={delay((i % 3) * 70)}>
                <span className="dx-chapter-head">
                  <span className="dx-chapter-no">{c.group === "Reference" ? "Appendix" : `Chapter ${c.no}`}</span>
                  <span className="dx-chapter-g">{c.group}</span>
                </span>
                <span className="dx-chapter-t">{c.title}</span>
                <span className="dx-chapter-s">{c.short}</span>
                <span className="dx-chapter-m">
                  {c.minutes} min read <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="fv-block" aria-labelledby="live-title">
        <div className="fv-wrap">
          <div className="fv-block-head">
            <div data-reveal>
              <p className="fv-eyebrow">THE END GOAL</p>
              <h2 className="fv-h2" id="live-title">
                A new frame every 33 milliseconds, on one GPU.
              </h2>
            </div>
            <p className="fv-lead" data-reveal style={delay(80)}>
              Live try-on redraws the shopper on their own camera, frame by frame, with a memory of the garment so a print stays
              the same print as they turn.{" "}
              <Link href="/docs/video-and-live" className="dx-inline-link">
                How the field got here
              </Link>
              .
            </p>
          </div>
          <LoopFigure n="Figure 2" />
        </div>
      </section>

      <CtaBand
        eyebrow="SUPPORT THE PROGRAMME"
        title="Fund data, evaluation and researchers."
        text="Research grants, compute partners and investors: request the full proposal or talk to the founders."
        primary={{ label: "Investors", href: "/investors" }}
      />
    </Shell>
  );
}
