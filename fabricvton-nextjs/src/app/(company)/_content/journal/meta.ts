/**
 * Journal posts. Each post's body lives in its own module (./<slug>.tsx). `date` is the day the post was
 * published on this site. Update it if the posts go live on a different day. Never back-date.
 */

export type PostMeta = {
  slug: string;
  title: string;
  dek: string;
  topic: string;
  date: string;
  minutes: number;
  image: { src: string; width: number; height: number };
};

export const POSTS: PostMeta[] = [
  {
    slug: "a-short-history-of-virtual-try-on",
    title: "A short history of virtual try-on",
    dek: "From warping a product photo onto a body to diffusion models that learn where every thread should go: how the field got here, and what is still unsolved.",
    topic: "Field notes",
    date: "2026-09-25",
    minutes: 9,
    image: { src: "/brand/card-interaction.webp", width: 720, height: 450 },
  },
  {
    slug: "why-fabric-is-harder-than-pixels",
    title: "Why fabric is harder than pixels",
    dek: "Texture, print, material and drape: the properties of cloth that make try-on a physical problem, not just an image problem.",
    topic: "Material intelligence",
    date: "2026-09-25",
    minutes: 7,
    image: { src: "/brand/ui/research-3.webp", width: 324, height: 248 },
  },
  {
    slug: "evaluating-texture-fidelity-in-vto",
    title: "Evaluating texture fidelity in VTO",
    dek: "What FID, LPIPS, SSIM and DISTS actually measure, why none of them is enough on its own, and a framework for measuring whether the shirt still looks like the shirt.",
    topic: "Evaluation",
    date: "2026-09-25",
    minutes: 8,
    image: { src: "/brand/ui/research-4.webp", width: 324, height: 248 },
  },
  {
    slug: "pose-consistency-in-garment-generation",
    title: "Pose consistency in garment generation",
    dek: "Why one good frame isn’t enough, and what it takes to keep a garment the same across poses, views and video.",
    topic: "Generative vision",
    date: "2026-09-25",
    minutes: 7,
    image: { src: "/brand/clothsy/person.webp", width: 720, height: 995 },
  },
  {
    slug: "fast-enough-for-a-storefront",
    title: "Fast enough for a storefront",
    dek: "Diffusion models are slow by design. How step distillation works, what it costs in detail, and why speed is a research problem for try-on.",
    topic: "Efficient visual AI",
    date: "2026-09-25",
    minutes: 7,
    image: { src: "/brand/ui/research-2.webp", width: 324, height: 248 },
  },
  {
    slug: "where-training-data-comes-from",
    title: "Where training data comes from",
    dek: "Most public try-on datasets are licensed for research only. Why provenance, consent and privacy shape how a commercial try-on model has to be built.",
    topic: "Data and responsibility",
    date: "2026-09-25",
    minutes: 7,
    image: { src: "/brand/ui/research-1.webp", width: 324, height: 248 },
  },
];

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
