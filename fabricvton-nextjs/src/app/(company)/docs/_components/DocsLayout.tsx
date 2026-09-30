import Link from "next/link";
import type { ReactNode } from "react";
import Shell from "../../_components/Shell";
import { Arrow } from "../../_components/Arrow";
import { CHAPTERS, DOCS_VERSION, GROUPS, type Chapter } from "../_data/chapters";
import DocsChrome from "./DocsChrome";
import { Sources } from "./Doc";

export type TocItem = { id: string; label: string };

/** The chapter list, grouped. Used in the desktop sidebar and in the phone "Chapters" drawer. */
function ChapterNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Docs chapters" className="dx-nav">
      <Link href="/docs" className="dx-nav-home" aria-current={current ? undefined : "page"}>
        Overview
      </Link>
      {GROUPS.map((g) => (
        <div key={g} className="dx-nav-group">
          <p>{g}</p>
          <ol>
            {CHAPTERS.filter((c) => c.group === g).map((c) => (
              <li key={c.slug}>
                <Link href={`/docs/${c.slug}`} aria-current={c.slug === current ? "page" : undefined}>
                  <span className="dx-nav-n">{c.no}</span>
                  <span>{c.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>
  );
}

export default function DocsLayout({
  chapter,
  toc,
  sources,
  children,
}: {
  chapter: Chapter;
  toc: TocItem[];
  sources?: number[];
  children: ReactNode;
}) {
  const i = CHAPTERS.findIndex((c) => c.slug === chapter.slug);
  const prev = CHAPTERS[i - 1];
  const next = CHAPTERS[i + 1];

  return (
    <Shell current="/docs">
      <div className="dx-progress" aria-hidden="true" />
      <header className="dx-head">
        <div className="fv-wrap">
          <nav className="fv-crumbs" aria-label="Breadcrumb" data-reveal>
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/docs">Docs</Link>
              </li>
              <li>
                <span aria-current="page">{chapter.title}</span>
              </li>
            </ol>
          </nav>
          <p className="dx-kicker" data-reveal>
            <span className="dx-kicker-no">{chapter.group === "Reference" ? "Appendix" : `Chapter ${chapter.no}`}</span>
            <span>{chapter.group}</span>
            <span>{chapter.minutes} min read</span>
            <span>{DOCS_VERSION}</span>
          </p>
          <h1 className="dx-h1" data-reveal>
            {chapter.title}
          </h1>
          <p className="dx-dek" data-reveal>
            {chapter.dek}
          </p>
        </div>
      </header>

      <div className="dx-body">
        <div className="fv-wrap dx-grid">
          <aside className="dx-side">
            <details className="dx-drawer">
              <summary>
                <span>Chapters</span>
                <span className="dx-drawer-now">
                  {chapter.no} · {chapter.title}
                </span>
              </summary>
              <ChapterNav current={chapter.slug} />
            </details>
            <div className="dx-side-sticky">
              <ChapterNav current={chapter.slug} />
            </div>
          </aside>

          <article className="dx-article fv-prose">
            {children}
            {sources?.length ? <Sources nums={sources} /> : null}
            <nav className="dx-pager" aria-label="Previous and next chapter">
              {prev ? (
                <Link href={`/docs/${prev.slug}`} className="dx-pager-prev">
                  <span>Previous</span>
                  <b>
                    <span aria-hidden="true">←</span> {prev.title}
                  </b>
                </Link>
              ) : (
                <Link href="/docs" className="dx-pager-prev">
                  <span>Previous</span>
                  <b>
                    <span aria-hidden="true">←</span> Overview
                  </b>
                </Link>
              )}
              {next ? (
                <Link href={`/docs/${next.slug}`} className="dx-pager-next">
                  <span>Next</span>
                  <b>
                    {next.title} <Arrow />
                  </b>
                </Link>
              ) : null}
            </nav>
          </article>

          {toc.length ? (
            <nav className="dx-toc" aria-label="On this page">
              <p>On this page</p>
              <ol>
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>{t.label}</a>
                  </li>
                ))}
                {sources?.length ? (
                  <li>
                    <a href="#sources-title">Sources</a>
                  </li>
                ) : null}
              </ol>
            </nav>
          ) : null}
        </div>
      </div>
      <DocsChrome />
    </Shell>
  );
}
