import type { ReactNode } from "react";
import { DOC_REFS } from "../_data/refs";

/**
 * Building blocks for the docs chapters: numbered citations that match the proposal, tables, callouts
 * and section headings. Chapters are plain JSX built from these.
 */

/** Inline citation: <R n={8} /> or <R n={[2, 3, 12]} /> renders [8] / [2, 3, 12], each linked to its source below. */
export function R({ n }: { n: number | number[] }) {
  const list = Array.isArray(n) ? n : [n];
  return (
    <span className="dx-cite">
      [
      {list.map((k, i) => (
        <span key={k}>
          {i ? ", " : ""}
          <a href={`#ref-${k}`} aria-label={`Source ${k}`}>
            {k}
          </a>
        </span>
      ))}
      ]
    </span>
  );
}

/** Numbered section heading with an anchor for the on-page contents. */
export function H2({ id, n, children }: { id: string; n: string; children: ReactNode }) {
  return (
    <h2 id={id} className="dx-h2">
      <span className="dx-h2-n">{n}</span>
      <span>{children}</span>
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3>{children}</h3>;
}

type Cell = ReactNode;

/** A numbered table. Wide tables scroll inside their frame, never the page. */
export function T({
  n,
  title,
  head,
  rows,
  note,
  first = true,
  dense,
}: {
  n: string;
  title: string;
  head: string[];
  rows: Cell[][];
  note?: ReactNode;
  /** Render the first column as a row header. */
  first?: boolean;
  dense?: boolean;
}) {
  return (
    <figure className={`dx-table${dense ? " dx-table--dense" : ""}`} data-reveal>
      <figcaption>
        <b>{n}</b> {title}
      </figcaption>
      <div className="dx-table-scroll" tabIndex={0} role="region" aria-label={`${n}: ${title}`}>
        <table>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) =>
                  j === 0 && first ? (
                    <th key={j} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={j}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="dx-table-note">{note}</p> : null}
    </figure>
  );
}

export function Callout({ label, children, tone = "plain" }: { label?: string; children: ReactNode; tone?: "plain" | "accent" | "dark" }) {
  return (
    <aside className={`dx-callout dx-callout--${tone}`} data-reveal>
      {label ? <b>{label}</b> : null}
      <div>{children}</div>
    </aside>
  );
}

/** "Key point" bullets with bold lead-ins, used for principles and summaries. */
export function Points({ items }: { items: { k: ReactNode; t: ReactNode }[] }) {
  return (
    <ul className="dx-points">
      {items.map((it, i) => (
        <li key={i}>
          <strong>{it.k}</strong> {it.t}
        </li>
      ))}
    </ul>
  );
}

/** The sources cited in a chapter, in number order, anchored for the inline [n] links. */
export function Sources({ nums, title = "Sources in this chapter" }: { nums: number[]; title?: string }) {
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  return (
    <section className="dx-sources" aria-labelledby="sources-title">
      <h2 id="sources-title">{title}</h2>
      <ol>
        {sorted.map((k) => {
          const r = DOC_REFS[k];
          if (!r) return null;
          return (
            <li key={k} id={`ref-${k}`} value={k}>
              <span className="dx-src-n">[{k}]</span>
              <span>
                {r.text}{" "}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
