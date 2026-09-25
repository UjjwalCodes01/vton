import Image from "next/image";
import { REFS } from "../_content/refs";
import { CONTACT_HREF, RESEARCH_FORM_URL } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

/** Dark call-to-action band used at the foot of inner pages. */
export function CtaBand({
  eyebrow = "JOIN THE RESEARCH TEAM",
  title = "Work on the open problems with us.",
  text = "Students, researchers and engineers. The application takes about two minutes.",
  primary = { label: "Apply", href: RESEARCH_FORM_URL, external: true },
}: {
  eyebrow?: string;
  title?: string;
  text?: string;
  primary?: { label: string; href: string; external?: boolean };
}) {
  return (
    <section className="fv-block">
      <div className="fv-wrap">
        <div className="fv-band" data-reveal>
          <div>
            <p className="fv-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <div className="fv-actions">
            <a
              className="fv-btn fv-btn--dark"
              href={primary.href}
              data-magnet
              {...(primary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {primary.label} <Arrow dir={primary.external ? "up" : "right"} />
            </a>
            <a className="fv-btn fv-btn--soft" href={CONTACT_HREF}>
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Numbered reference list. `keys` order defines the numbers used by <Cite>. */
export function RefList({ keys, title = "References" }: { keys: string[]; title?: string }) {
  return (
    <section className="fv-refs" aria-labelledby="refs-title">
      <h2 id="refs-title">{title}</h2>
      <ol>
        {keys.map((k) => {
          const r = REFS[k];
          if (!r) return null;
          return (
            <li key={k} id={`ref-${k}`}>
              {r.authors} <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>. <i>{r.venue}</i>, {r.year}.
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Inline citation marker: <Cite k="viton" keys={REF_KEYS} /> renders [n] linking to the reference. */
export function Cite({ k, keys }: { k: string | string[]; keys: string[] }) {
  const list = Array.isArray(k) ? k : [k];
  return (
    <>
      {list.map((key) => {
        const n = keys.indexOf(key) + 1;
        return (
          <a key={key} className="fv-cite" href={`#ref-${key}`} aria-label={`Reference ${n}`}>
            [{n}]
          </a>
        );
      })}
    </>
  );
}

export type CardData = { href: string; image?: { src: string; width: number; height: number }; meta?: string; title: string; text: string; more?: string; external?: boolean };

export function Card({ card, i = 0 }: { card: CardData; i?: number }) {
  return (
    <a
      className="fv-card"
      href={card.href}
      data-reveal
      data-magnet
      style={delay(i * 70)}
      {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {card.image ? (
        <span className="fv-card-media">
          <Image src={card.image.src} alt="" width={card.image.width} height={card.image.height} sizes="(max-width: 699px) 100vw, 400px" unoptimized />
        </span>
      ) : null}
      <span className="fv-card-body">
        {card.meta ? <span className="fv-card-meta">{card.meta}</span> : null}
        <span className="fv-card-title">{card.title}</span>
        <span className="fv-card-text">{card.text}</span>
        <span className="fv-card-more">
          {card.more ?? "Read more"} <Arrow dir={card.external ? "up" : "right"} />
        </span>
      </span>
    </a>
  );
}
