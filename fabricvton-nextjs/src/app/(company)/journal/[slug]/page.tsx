import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CtaBand, RefList } from "../../_components/Blocks";
import Shell from "../../_components/Shell";
import { POSTS, formatDate, postBySlug } from "../../_content/journal/meta";
import { POST_BODIES } from "../../_content/journal/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} · Journal`,
    description: post.dek,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.dek, publishedTime: post.date, url: `/journal/${post.slug}` },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  const body = POST_BODIES[slug];
  if (!post || !body) notFound();
  const others = POSTS.filter((p) => p.slug !== slug).slice(0, 2);
  const { Body, refs, toc } = body;

  return (
    <Shell current="/journal">
      <header className="fv-post-head">
        <div className="fv-wrap">
          <nav className="fv-crumbs" aria-label="Breadcrumb" data-reveal>
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/journal">Journal</Link>
              </li>
              <li>
                <span aria-current="page">{post.title}</span>
              </li>
            </ol>
          </nav>
          <p className="fv-post-kicker" data-reveal>
            <span>{post.topic}</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>{post.minutes} min read</span>
            <span>FabricVTON Research</span>
          </p>
          <h1 className="fv-post-h1" data-reveal>
            {post.title}
          </h1>
          <p className="fv-post-dek" data-reveal>
            {post.dek}
          </p>
        </div>
      </header>

      <section className="fv-post-body" style={{ borderTop: "1px solid var(--fv-line)" }}>
        <div className="fv-wrap fv-article-wrap">
          <nav className="fv-toc" aria-label="In this post">
            <p>In this post</p>
            <ol>
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`}>{t.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="fv-prose">
            <Body />
            <RefList keys={refs} />
            <div className="fv-related">
              <p>Keep reading</p>
              <div className="fv-cards">
                {others.map((p) => (
                  <Card key={p.slug} card={{ href: `/journal/${p.slug}`, meta: p.topic, title: p.title, text: p.dek, more: "Read" }} />
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>
      <CtaBand />
    </Shell>
  );
}
