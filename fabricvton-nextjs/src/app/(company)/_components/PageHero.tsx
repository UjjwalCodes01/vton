import { delay } from "../_lib/style";

export type Crumb = { label: string; href?: string };

/**
 * Header for every inner page: breadcrumb, eyebrow, title, lead, and an optional visual on the right.
 * Same type scale and cream backdrop as the homepage hero, without the pinned motion.
 */
export default function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  children,
  tone = "light",
}: {
  crumbs?: Crumb[];
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
  tone?: "light" | "panel";
}) {
  return (
    <header className={`fv-page-hero fv-page-hero--${tone}${children ? " has-art" : ""}`}>
      <div className="fv-wrap fv-page-hero-grid">
        <div className="fv-page-hero-copy">
          {crumbs?.length ? (
            <nav className="fv-crumbs" aria-label="Breadcrumb" data-reveal>
              <ol>
                {crumbs.map((c, i) => (
                  <li key={c.label}>
                    {c.href && i < crumbs.length - 1 ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <p className="fv-eyebrow" data-reveal style={delay(40)}>
            {eyebrow}
          </p>
          <h1 className="fv-h1 fv-page-title" data-reveal style={delay(90)}>
            {title}
          </h1>
          {lead ? (
            <p className="fv-lead fv-page-lead" data-reveal style={delay(150)}>
              {lead}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="fv-page-hero-art" data-reveal style={delay(160)}>
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}
