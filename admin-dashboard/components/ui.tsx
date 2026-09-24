// The handful of shapes every page is built from.

import Link from "next/link";
import { number, percent } from "@/lib/format";

export function Stat({ label, value, hint, tone = "" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}</b>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}

export function Badge({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Card({
  title,
  action,
  flush = false,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {title || action ? (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={`card-body${flush ? " flush" : ""}`}>{children}</div>
    </section>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="page-actions">{actions}</div>
    </header>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Meter({ used, of, slim = false }: { used: number; of: number; slim?: boolean }) {
  return (
    <div className={`meter${slim ? " slim" : ""}`}>
      <span style={{ width: `${percent(used, of)}%` }} />
    </div>
  );
}

/** A bar chart drawn with divs — no chart library, nothing to load. */
export function BarChart({ rows, height = 120 }: { rows: { label: string; value: number }[]; height?: number }) {
  if (!rows.length) return <Empty>Nothing to show yet.</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <>
      <div className="chart" style={{ ["--chart-h" as string]: `${height}px` }}>
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="bar" title={`${row.label}: ${number(row.value)}`}>
            <span className="bar-fill" style={{ height: `${Math.round((row.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="chart-axis">
        <span>{rows[0].label}</span>
        <span>{rows[rows.length - 1].label}</span>
      </div>
    </>
  );
}

export function Pager({ base, page, pages }: { base: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      {page > 1 ? <Link className="btn ghost sm" href={`${base}page=${page - 1}`}>← Previous</Link> : <span />}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link className="btn ghost sm" href={`${base}page=${page + 1}`}>Next →</Link> : <span />}
    </div>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const woo = platform === "woocommerce";
  return <Badge tone={woo ? "woo" : "shopify"}>{woo ? "WooCommerce" : "Shopify"}</Badge>;
}
