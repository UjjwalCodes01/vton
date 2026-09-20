import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "../../components/icons";
import { GUIDES } from "../../lib/content";
import { LEGAL } from "../../lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps<"/resources/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.summary, alternates: { canonical: `/resources/${guide.slug}` } };
}

export default async function GuidePage({ params }: PageProps<"/resources/[slug]">) {
  const { slug } = await params;
  const index = GUIDES.findIndex((g) => g.slug === slug);
  if (index === -1) notFound();

  const guide = GUIDES[index];
  const next = GUIDES[(index + 1) % GUIDES.length];

  return (
    <main id="main" tabIndex={-1}>
      <article className="guide">
        <div className="shell guide-shell">
          <Link className="guide-back" href="/resources#guides">
            <ArrowRight className="flip" /> All guides
          </Link>
          <p className="eyebrow eyebrow-violet">For {guide.audience.toLowerCase()}</p>
          <h1 className="display">{guide.title}</h1>
          <p className="lede">{guide.summary}</p>

          <div className="guide-body">
            {guide.body.map((block, i) => {
              if (block.type === "h") return <h2 key={i}>{block.text}</h2>;
              if (block.type === "ul")
                return (
                  <ul key={i}>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              return <p key={i}>{block.text}</p>;
            })}
          </div>

          {guide.slug === "what-happens-to-your-photo" ? (
            <p className="guide-legal">
              <a className="btn btn-ghost btn-sm" href={LEGAL.shopperPrivacy} target="_blank" rel="noopener noreferrer">
                Read the full shopper privacy policy <ArrowUpRight className="btn-arrow" />
              </a>
            </p>
          ) : null}

          <nav className="guide-next" aria-label="Next guide">
            <span>Next guide</span>
            <Link href={`/resources/${next.slug}`}>
              {next.title} <ArrowRight className="btn-arrow" />
            </Link>
          </nav>
        </div>
      </article>
    </main>
  );
}
