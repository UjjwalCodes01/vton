import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocsLayout from "../_components/DocsLayout";
import { CHAPTER_BODIES } from "../_chapters";
import { CHAPTERS, chapterBySlug } from "../_data/chapters";
import "../docs.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = chapterBySlug(slug);
  if (!c) return {};
  return {
    title: `${c.title} · Docs`,
    description: c.dek,
    alternates: { canonical: `/docs/${c.slug}` },
    openGraph: { type: "article", title: `${c.title} · FabricVTON research programme`, description: c.dek, url: `/docs/${c.slug}` },
  };
}

export default async function DocChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = chapterBySlug(slug);
  const body = CHAPTER_BODIES[slug];
  if (!chapter || !body) notFound();
  const { Body, toc, sources } = body;
  return (
    <DocsLayout chapter={chapter} toc={toc} sources={sources}>
      <Body />
    </DocsLayout>
  );
}
