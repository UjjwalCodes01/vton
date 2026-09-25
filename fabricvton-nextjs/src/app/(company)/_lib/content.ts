import { RESEARCH_FORM_URL } from "./site";

/**
 * All homepage copy that is likely to change, kept out of the components.
 * Nothing here is a claim about results: no metrics, customers, dates or publications.
 */

export type Img = { src: string; width: number; height: number };

export const NAV_LINKS = [
  { label: "Research", href: "/research" },
  { label: "Products", href: "/products" },
  { label: "Journal", href: "/journal" },
  { label: "Company", href: "/company" },
  { label: "Careers", href: "/careers" },
] as const;

/* ---- Research fields --------------------------------------------------- */

export type ResearchField = {
  no: string;
  slug: string;
  title: string;
  description: string;
  image: Img;
};

export const RESEARCH_FIELDS: ResearchField[] = [
  {
    no: "01",
    slug: "visual-understanding",
    title: "Visual Understanding",
    description: "Models that understand people, objects, garments and environments.",
    image: { src: "/brand/ui/research-1.webp", width: 324, height: 248 },
  },
  {
    no: "02",
    slug: "generative-vision",
    title: "Generative Vision",
    description: "Systems that can transform visual inputs while preserving structure and identity.",
    image: { src: "/brand/ui/research-2.webp", width: 324, height: 248 },
  },
  {
    no: "03",
    slug: "material-intelligence",
    title: "Material Intelligence",
    description: "Understanding appearance, texture, geometry and physical characteristics.",
    image: { src: "/brand/ui/research-3.webp", width: 324, height: 248 },
  },
  {
    no: "04",
    slug: "human-object-interaction",
    title: "Human–Object Interaction",
    description: "Modeling how objects change when interacting with people and in the real world.",
    image: { src: "/brand/ui/research-4.webp", width: 324, height: 248 },
  },
];

/* ---- Open problems ------------------------------------------------------ */

/** What the research team is working on now. Same four problems the application form lists. */
export const OPEN_PROBLEMS = [
  { title: "Fabric fidelity through warping", text: "Keeping texture, print and logos intact while a garment is warped onto a body." },
  { title: "Drape and folds", text: "Realistic drape, folds and fit across different body shapes." },
  { title: "Pose and camera consistency", text: "The same garment, consistent across poses and camera angles." },
  { title: "Fast, affordable inference", text: "Generation fast and cheap enough to run on a live storefront." },
] as const;

/* ---- Approach pipeline -------------------------------------------------- */

/**
 * Five stages shown as garments. `from` is the scroll progress (0..1) at which a stage starts to
 * appear. The garment renders are illustrations of the idea, not outputs of a running model.
 */
export const PIPELINE = [
  { label: "Input", name: "Image", from: -0.3, image: { src: "/brand/ui/garment-1.webp", width: 230, height: 220 } },
  { label: "Geometry", name: "Structure", from: 0.1, image: { src: "/brand/ui/garment-2.webp", width: 230, height: 220 } },
  { label: "Material", name: "Texture & Fabric", from: 0.24, image: { src: "/brand/ui/garment-3.webp", width: 230, height: 220 } },
  { label: "Model", name: "Generative AI", from: 0.38, image: { src: "/brand/ui/garment-4.webp", width: 230, height: 220 } },
  { label: "Output", name: "Realistic Result", from: 0.52, image: { src: "/brand/ui/garment-5.webp", width: 230, height: 220 } },
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
    excerpt: "Exploring the unique challenges of modeling texture, drape and material properties in generative AI.",
    status: "published",
    publishedAt: "2026-09-25",
    image: { src: "/brand/ui/journal-1.webp", width: 122, height: 176 },
  },
  {
    slug: "evaluating-texture-fidelity-in-vto",
    title: "Evaluating texture fidelity in VTO",
    excerpt: "A framework for measuring how well AI preserves print, weave and material identity.",
    status: "published",
    publishedAt: "2026-09-25",
    image: { src: "/brand/ui/journal-2.webp", width: 122, height: 176 },
  },
  {
    slug: "pose-consistency-in-garment-generation",
    title: "Pose consistency in garment generation",
    excerpt: "Why one good frame isn’t enough, and how we maintain identity across views and poses.",
    status: "published",
    publishedAt: "2026-09-25",
    image: { src: "/brand/ui/journal-3.webp", width: 122, height: 176 },
  },
];

/* ---- Careers ------------------------------------------------------------ */

export type Role = { title: string; href: string; meta?: string };

/** Only list roles that are actually open. Empty = the "always interested" copy is shown on its own. */
export const ROLES: Role[] = [
  { title: "Virtual Try-On Research Team", href: RESEARCH_FORM_URL, meta: "Students, researchers, engineers" },
];
