/**
 * All homepage copy that is likely to change, kept out of the components.
 * Nothing here is a claim about results: no metrics, customers, dates or publications.
 */

export type Img = { src: string; width: number; height: number };

export const NAV_LINKS = [
  { label: "Research", href: "#research" },
  { label: "Products", href: "#products" },
  { label: "Journal", href: "#journal" },
  { label: "Company", href: "#company" },
  { label: "Careers", href: "#careers" },
] as const;

/* ---- Research fields --------------------------------------------------- */

export type ResearchField = {
  no: string;
  title: string;
  description: string;
  image: Img;
  /** Where the card goes. Point each at its own page (e.g. /research/<slug>) once those exist. */
  href: string;
};

export const RESEARCH_FIELDS: ResearchField[] = [
  {
    no: "01",
    title: "Visual Understanding",
    description: "Models that understand people, objects, garments and environments.",
    image: { src: "/brand/fabric-cream-1.webp", width: 360, height: 222 },
    href: "#approach",
  },
  {
    no: "02",
    title: "Generative Vision",
    description: "Systems that transform visual inputs while preserving structure, identity and detail.",
    image: { src: "/brand/fabric-cream-2.webp", width: 216, height: 132 },
    href: "#approach",
  },
  {
    no: "03",
    title: "Material Intelligence",
    description: "Understanding appearance, texture, geometry and the visual characteristics of physical materials.",
    image: { src: "/brand/fabric-graphite-1.webp", width: 240, height: 147 },
    href: "#approach",
  },
  {
    no: "04",
    title: "Human–Object Interaction",
    description: "Modeling how objects change when interacting with people and environments.",
    image: { src: "/brand/fabric-relation.webp", width: 320, height: 200 },
    href: "#approach",
  },
];

/* ---- Approach pipeline -------------------------------------------------- */

/** `from` is the scroll progress (0..1) at which the stage starts to appear; the dot reaches it ~0.1 later. */
export const PIPELINE = [
  { label: "Input", name: "Image", from: -0.3 },
  { label: "Geometry", name: "Structure", from: 0.145 },
  { label: "Material", name: "Texture & Fabric", from: 0.35 },
  { label: "Model", name: "Generative AI", from: 0.555 },
  { label: "Output", name: "Realistic Result", from: 0.76 },
] as const;

/* ---- Clothsy try-on composite ------------------------------------------ */

export const TRYON_STATUS = [
  { label: "Garment", a: 0.06, b: 0.3 },
  { label: "Person", a: 0.26, b: 0.52 },
  { label: "Generating", a: 0.5, b: 0.84 },
  { label: "Result", a: 0.82, b: 1 },
] as const;

/* ---- Journal ------------------------------------------------------------ */

export type JournalPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** Drafts render as static, non-linking cards with no date. Only "published" posts link. */
  status: "draft" | "published";
  /** ISO date, shown only when published. Never invent one. */
  publishedAt?: string;
  image: Img;
};

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: "why-fabric-is-harder-than-pixels",
    title: "Why fabric is harder than pixels",
    excerpt: "Exploring the challenges of modeling texture, drape and material properties in generative AI.",
    status: "draft",
    image: { src: "/brand/fabric-graphite-1.webp", width: 240, height: 147 },
  },
  {
    slug: "evaluating-texture-fidelity-in-virtual-try-on",
    title: "Evaluating texture fidelity in virtual try-on",
    excerpt: "Thinking about how visual AI preserves print, weave and material identity.",
    status: "draft",
    image: { src: "/brand/fabric-cream-1.webp", width: 360, height: 222 },
  },
  {
    slug: "pose-consistency-in-garment-generation",
    title: "Pose consistency in garment generation",
    excerpt: "Why realistic generation is not enough — and how systems maintain identity across different views.",
    status: "draft",
    image: { src: "/brand/fabric-relation.webp", width: 320, height: 200 },
  },
];

/* ---- Careers ------------------------------------------------------------ */

export type Role = { title: string; href: string; meta?: string };

/** Only list roles that are actually open. Empty = the "always interested" copy is shown on its own. */
export const ROLES: Role[] = [];
