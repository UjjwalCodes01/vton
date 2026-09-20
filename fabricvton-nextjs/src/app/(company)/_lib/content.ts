/**
 * Homepage content.
 *
 * Nothing here may be an invented claim: no metrics, customers, testimonials, publications,
 * dates, authors or results. Anything real we do not have yet is a [TOKEN] placeholder and is
 * listed in CONTENT_TODO.md.
 */

/** An image we may not have yet. With no `src`, components render a labelled placeholder panel. */
export type ImageSlot = {
  /** The placeholder name shown until a real image is supplied, e.g. "[EVIDENCE_BEFORE]". */
  token: string;
  src?: string;
  width?: number;
  height?: number;
  /** Required once `src` is set. */
  alt?: string;
};

export const NAV_LINKS = [
  { label: "Research", href: "#research" },
  { label: "Clothsy AI", href: "#clothsy" },
  { label: "Team", href: "#team" },
  { label: "Work with us", href: "#collaborate" },
] as const;

/* ---- Research ----------------------------------------------------------- */

export type ResearchField = {
  no: string;
  title: string;
  description: string;
  image: ImageSlot;
};

export const RESEARCH_FIELDS: ResearchField[] = [
  {
    no: "01",
    title: "Visual Understanding",
    description:
      "Reading a garment from a single photo: its silhouette, seams, panels, and how it sits on a body.",
    image: { token: "[RESEARCH_IMAGE_VISUAL_UNDERSTANDING]" },
  },
  {
    no: "02",
    title: "Generative Vision",
    description:
      "Rendering a garment onto a different person while its print, weave and logo placement stay identical.",
    image: { token: "[RESEARCH_IMAGE_GENERATIVE_VISION]" },
  },
  {
    no: "03",
    title: "Material Intelligence",
    description:
      "Telling denim from silk from knit, and predicting how each one folds, creases and catches light.",
    image: { token: "[RESEARCH_IMAGE_MATERIAL_INTELLIGENCE]" },
  },
  {
    no: "04",
    title: "Human–Object Interaction",
    description:
      "How a garment changes on a real body: where it stretches, bunches and hangs as someone moves.",
    image: { token: "[RESEARCH_IMAGE_HUMAN_OBJECT_INTERACTION]" },
  },
  {
    no: "05",
    title: "Efficient Visual AI",
    description:
      "Running these models fast enough, and cheaply enough, to sit inside a live storefront.",
    image: { token: "[RESEARCH_IMAGE_EFFICIENT_VISUAL_AI]" },
  },
];

/* ---- Evidence ----------------------------------------------------------- */

export const EVIDENCE = {
  before: { token: "[EVIDENCE_BEFORE]" } as ImageSlot,
  after: { token: "[EVIDENCE_AFTER]" } as ImageSlot,
  caption: "[EVIDENCE_CAPTION]",
};

/* ---- Clothsy AI --------------------------------------------------------- */

/** The existing Clothsy demo set: a real person photo, a real garment, and the model's own output. */
export const CLOTHSY_DEMO = {
  person: { token: "[CLOTHSY_PERSON]", src: "/brand/clothsy/person.webp", width: 720, height: 995, alt: "The shopper's own photo, before try-on" },
  garment: { token: "[CLOTHSY_GARMENT]", src: "/brand/clothsy/garment-flat.webp", width: 480, height: 639, alt: "The garment as listed in the store" },
  result: { token: "[CLOTHSY_RESULT]", src: "/brand/clothsy/result.webp", width: 720, height: 995, alt: "The generated try-on: the same person wearing the garment" },
} satisfies Record<string, ImageSlot>;

/* ---- Team --------------------------------------------------------------- */

export type Founder = {
  name: string;
  role: string;
  background: string;
  linkedin: string;
};

/** Five slots. Delete the ones you don't need; the grid reflows. */
export const TEAM: Founder[] = [
  { name: "[FOUNDER_1_NAME]", role: "[FOUNDER_1_ROLE]", background: "[FOUNDER_1_BACKGROUND]", linkedin: "[FOUNDER_1_LINKEDIN]" },
  { name: "[FOUNDER_2_NAME]", role: "[FOUNDER_2_ROLE]", background: "[FOUNDER_2_BACKGROUND]", linkedin: "[FOUNDER_2_LINKEDIN]" },
  { name: "[FOUNDER_3_NAME]", role: "[FOUNDER_3_ROLE]", background: "[FOUNDER_3_BACKGROUND]", linkedin: "[FOUNDER_3_LINKEDIN]" },
  { name: "[FOUNDER_4_NAME]", role: "[FOUNDER_4_ROLE]", background: "[FOUNDER_4_BACKGROUND]", linkedin: "[FOUNDER_4_LINKEDIN]" },
  { name: "[FOUNDER_5_NAME]", role: "[FOUNDER_5_ROLE]", background: "[FOUNDER_5_BACKGROUND]", linkedin: "[FOUNDER_5_LINKEDIN]" },
];

/* ---- Collaborate -------------------------------------------------------- */

export const COMPANY_PROBLEM_STATEMENT = "[COMPANY_PROBLEM_STATEMENT]";

export const COLLABORATION_DOORS = [
  {
    title: "Research collaboration",
    description: "Joint work and co-authored papers on garment, material and human–object modelling.",
  },
  {
    title: "Data partnerships",
    description: "Garment and try-on datasets, shared under terms that work for both sides.",
  },
  {
    title: "IP and patent licensing",
    description: "License our methods for virtual try-on and material understanding.",
  },
  {
    title: "Brand pilots",
    description: "Run a try-on pilot on your own catalogue and measure what changes.",
  },
] as const;

/* ---- Journal (hidden until a real post exists; see SHOW_JOURNAL) --------- */

export type JournalPost = {
  slug: string;
  title: string;
  excerpt: string;
  status: "draft" | "published";
  /** ISO date, shown only when published. Never invent one. */
  publishedAt?: string;
  image: ImageSlot;
};

export const JOURNAL_POSTS: JournalPost[] = [];
