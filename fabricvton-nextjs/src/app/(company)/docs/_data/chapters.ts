/**
 * The research programme docs: one chapter per page, in reading order. The content follows the proposal
 * "Live Virtual Try-On for Every Garment and Every Body" (v1.2, 30 September 2026), public edition.
 */

export type Chapter = {
  slug: string;
  no: string;
  group: "Start here" | "The problem" | "State of the art" | "The programme" | "Reference";
  title: string;
  short: string;
  dek: string;
  minutes: number;
};

export const CHAPTERS: Chapter[] = [
  {
    slug: "summary",
    no: "0",
    group: "Start here",
    title: "Executive summary",
    short: "The programme, its approach and its outputs on one page.",
    dek: "An eighteen-month programme with one end goal: live video try-on, on FabricVTON's own model, for any garment and any body.",
    minutes: 4,
  },
  {
    slug: "problem",
    no: "1",
    group: "The problem",
    title: "The problem",
    short: "Why try-on still fails for many garments and shoppers, and why it must go live.",
    dek: "Try-on is now mainstream. It was built on a narrow wardrobe, it has never been audited for fairness, and live try-on runs only on closed, costly engines.",
    minutes: 7,
  },
  {
    slug: "image-try-on",
    no: "2A",
    group: "State of the art",
    title: "Image try-on today",
    short: "Architectures, reported results, industry systems, base models, datasets and evaluation.",
    dek: "How image try-on is built in 2026, which models and data a company can legally use, and where evaluation falls short.",
    minutes: 11,
  },
  {
    slug: "video-and-live",
    no: "2B",
    group: "State of the art",
    title: "Video and live try-on",
    short: "Video try-on, real-time generation, live products and the research gaps.",
    dek: "Live try-on has just become possible. How the field got there, who ships it, and what is still open.",
    minutes: 10,
  },
  {
    slug: "approach",
    no: "3A",
    group: "The programme",
    title: "Technical approach",
    short: "Objectives, design principles, the seven work packages and the image track.",
    dek: "Measure first, build commercially clean, and use the image model as the teacher for video.",
    minutes: 9,
  },
  {
    slug: "video-and-live-models",
    no: "3B",
    group: "The programme",
    title: "Video and live models",
    short: "The video model, the live student, evaluation, hypotheses and compute.",
    dek: "From an offline video try-on model to a live student that draws every frame in 33 to 66 milliseconds on one GPU.",
    minutes: 9,
  },
  {
    slug: "roadmap",
    no: "4",
    group: "The programme",
    title: "R&D roadmap",
    short: "Phases, schedule, milestones, publication calendar, governance and risks.",
    dek: "Eighteen months in seven phases, fifteen milestones and four papers, with the risks named up front.",
    minutes: 7,
  },
  {
    slug: "funding",
    no: "5",
    group: "The programme",
    title: "What funding enables",
    short: "Work already done, what funding unlocks, the budget and the funding scenarios.",
    dek: "The engineering foundation is self-funded. Data, human evaluation, compute and researchers are what the research needs next.",
    minutes: 5,
  },
  {
    slug: "outputs",
    no: "6A",
    group: "The programme",
    title: "Research outputs",
    short: "Papers, benchmark, models, software, indicators and open science.",
    dek: "Four papers, a public benchmark and toolkit, commercially usable image and video models, and live try-on on FabricVTON's own model.",
    minutes: 6,
  },
  {
    slug: "responsible-use",
    no: "6B",
    group: "The programme",
    title: "Responsible use",
    short: "Broader impact, the guardrail plan and live-session controls.",
    dek: "Try-on edits images of real people. The guardrails are designed in from the start, and live video gets its own.",
    minutes: 4,
  },
  {
    slug: "glossary",
    no: "G",
    group: "Reference",
    title: "Glossary",
    short: "The terms used across these docs.",
    dek: "Plain-language definitions of the terms used across the programme.",
    minutes: 3,
  },
  {
    slug: "references",
    no: "R",
    group: "Reference",
    title: "References",
    short: "One hundred and nineteen numbered sources.",
    dek: "Papers, model cards, licences and official pages, numbered exactly as in the proposal.",
    minutes: 6,
  },
];

export const GROUPS = ["Start here", "The problem", "State of the art", "The programme", "Reference"] as const;

export const chapterBySlug = (slug: string) => CHAPTERS.find((c) => c.slug === slug);

export const DOCS_VERSION = "Version 1.2 · 30 September 2026";
