/**
 * Research areas and open problems. Explanations of the field and of what we work on; no claims about results.
 * `reading` keys point into refs.ts (published, verified sources). `posts` are journal slugs.
 */

export type Area = {
  slug: string;
  no: string;
  title: string;
  short: string;
  lead: string;
  body: string[];
  questions: string[];
  reading: string[];
  posts: string[];
  image: { src: string; width: number; height: number };
};

export const AREAS: Area[] = [
  {
    slug: "visual-understanding",
    no: "01",
    title: "Visual Understanding",
    short: "Models that understand people, objects, garments and environments.",
    lead: "Before a model can dress someone, it has to understand the photo it was given.",
    body: [
      "Every try-on starts with perception. The model needs to know where the person is, how they are standing, which pixels are skin, hair, background and clothing, and roughly what shape the body is underneath. It needs to understand the product photo too: what kind of garment it is, where the collar, sleeves and hem are, and which details matter.",
      "These are classic computer-vision problems: human parsing, pose estimation, segmentation and dense body correspondence. Try-on stresses them in unusual ways. Loose, layered or dark clothing hides the body. Product photos arrive in every style, from flat lays and ghost mannequins to model shots. And errors compound: a parsing mistake at the start becomes a visible artifact at the end.",
      "Much of this layer is built on strong open research, such as pose estimators, human parsers and promptable segmentation models. Our work is in making it reliable on real shopper photos and real catalogues, and in knowing when an input will not produce a good result.",
    ],
    questions: [
      "How do we estimate body shape reliably under loose or layered clothing?",
      "Can one model understand garment structure (collar, sleeves, closures, hem) from any style of product photo?",
      "Can we tell, before generating anything, that a photo will give a poor result, and tell the person why?",
    ],
    reading: ["openpose", "densepose", "dwpose", "schp", "sam2"],
    posts: ["a-short-history-of-virtual-try-on", "pose-consistency-in-garment-generation"],
    image: { src: "/brand/ui/research-1.webp", width: 324, height: 248 },
  },
  {
    slug: "generative-vision",
    no: "02",
    title: "Generative Vision",
    short: "Systems that can transform visual inputs while preserving structure and identity.",
    lead: "Virtual try-on is image generation with a strict brief: change one thing, keep everything else.",
    body: [
      "A try-on model must change exactly one thing, the clothing, and keep everything else: the person's face and identity, their pose and body, the light and the background. Unconstrained generators are very good at making plausible images. The hard part is making the right one, with the exact garment from the product page.",
      "The field moved from warping the product image with an explicit geometric transform and blending it in, to diffusion models that learn where each part of the garment should go through attention. Diffusion brought large gains in realism and in robustness to pose. It also brought new problems: keeping fine detail through a compressed latent space, keeping identity exact, and sampling fast enough for someone who is shopping right now.",
    ],
    questions: [
      "How do we carry small, high-frequency detail such as text and logos through a latent diffusion model?",
      "How do we keep a person's identity exact while changing what they wear?",
      "How few sampling steps can we use before quality drops where people actually look?",
    ],
    reading: ["tryondiffusion", "stableviton", "idmvton", "ootdiffusion", "catvton", "lcm", "add"],
    posts: ["a-short-history-of-virtual-try-on", "fast-enough-for-a-storefront"],
    image: { src: "/brand/ui/research-2.webp", width: 324, height: 248 },
  },
  {
    slug: "material-intelligence",
    no: "03",
    title: "Material Intelligence",
    short: "Understanding appearance, texture, geometry and physical characteristics.",
    lead: "A garment is not a picture of a garment. It is a material, with weight, stretch and sheen.",
    body: [
      "Fabric has a weave or a knit, a sheen, a weight, some stretch and some stiffness. Those properties decide how it looks under light and how it hangs on a body, and they are only partly visible in a product photo.",
      "Graphics has long modelled them explicitly. Reflectance models describe appearance, and cloth simulation describes motion and drape. Learning-based methods now estimate appearance from photographs and learn garment dynamics. We are interested in bringing that physical understanding into generative try-on, so that a heavy wool coat and a light silk blouse behave differently even when their product photos look alike.",
    ],
    questions: [
      "Can we infer how a material behaves (weight, stiffness, stretch) from a product photo well enough to guide drape?",
      "How should texture be represented so it survives warping and generation intact?",
      "How do we measure texture fidelity in a way that matches what people perceive?",
    ],
    reading: ["deschaintre2018", "baraff1998", "snug", "hood", "dists"],
    posts: ["why-fabric-is-harder-than-pixels", "evaluating-texture-fidelity-in-vto"],
    image: { src: "/brand/ui/research-3.webp", width: 324, height: 248 },
  },
  {
    slug: "human-object-interaction",
    no: "04",
    title: "Human–Object Interaction",
    short: "Modeling how objects change when interacting with people and in the real world.",
    lead: "Clothes are objects that change shape when people wear them.",
    body: [
      "Garments stretch over shoulders, bunch at elbows, tuck into waistbands and disappear under jackets. Hands, hair and bags cover them. A try-on has to reason about all of it: what is in front of what, and how contact changes shape.",
      "The same questions reach beyond clothing, to how any object that is held, worn or carried interacts with a body. Research datasets of people handling objects capture this in 3D. We study the parts of it that show up in a single photograph, starting with layering and occlusion in outfits.",
    ],
    questions: [
      "How do we decide what belongs in front: hair over a collar, a hand over a pocket, a jacket over a shirt?",
      "How do we try on several garments at once and control how they are layered and styled?",
      "How does contact, like a strap on a shoulder or a belt at the waist, change the shape of what is worn?",
    ],
    reading: ["mmvto", "hrviton", "behave"],
    posts: ["why-fabric-is-harder-than-pixels", "pose-consistency-in-garment-generation"],
    image: { src: "/brand/ui/research-4.webp", width: 324, height: 248 },
  },
];

export type Problem = {
  slug: string;
  title: string;
  text: string;
  problem: string;
  hard: string[];
  explore: string[];
  measure: string[];
  figure: "warp" | "drape" | "pose" | "steps";
  post: string;
};

export const PROBLEMS: Problem[] = [
  {
    slug: "fidelity",
    title: "Fabric fidelity through warping",
    text: "Keeping texture, print and logos intact while a garment is warped onto a body.",
    problem:
      "A try-on has to move a flat product photo onto a body that is posed, turned and shaped differently. Every stripe, letter and logo has to survive the move. Small errors, like a bent letter, a smeared check or a pattern that changes scale, are exactly what a shopper notices first, and exactly what whole-image scores barely register.",
    hard: [
      "Printed detail lives in a few pixels, so average image-quality metrics hardly move when it is wrong.",
      "Latent diffusion models work in a compressed space, and fine print can be lost in the encoder before the generator ever sees it.",
      "The garment must deform because it is on a body, but its print must not distort beyond what the fabric physically allows.",
    ],
    explore: [
      "Garment encoders that keep high-frequency detail alongside semantic features.",
      "Losses and evaluation weighted toward printed and detailed regions.",
      "Refinement passes for small, detailed areas of the image.",
    ],
    measure: [
      "Paired reconstruction on held-out garments, scored on garment crops.",
      "Legibility checks for text and logos.",
      "Side-by-side human preference focused on detail.",
    ],
    figure: "warp",
    post: "evaluating-texture-fidelity-in-vto",
  },
  {
    slug: "drape",
    title: "Drape and folds",
    text: "Realistic drape, folds and fit across different body shapes.",
    problem:
      "The same garment looks different on different bodies. Fabric weight, stiffness and stretch decide where cloth clings, where it falls free and how many folds form. A try-on that copies the product photo's own folds onto every body looks wrong, and it says the wrong thing about fit.",
    hard: [
      "A product photo shows how the garment falls on a mannequin or a table, not on this body.",
      "Material properties are not labelled; they have to be inferred from appearance.",
      "Physically based cloth simulation is accurate, but needs 3D garment patterns that product photos do not come with.",
    ],
    explore: [
      "Conditioning on body shape as well as pose.",
      "Priors learned from physics-based cloth simulation.",
      "Separating a garment's own folds from the folds a body creates.",
    ],
    measure: [
      "Test sets of the same garment on different bodies.",
      "Human judgement of plausibility and of fit cues.",
      "Where hems, waists and sleeves land relative to body landmarks.",
    ],
    figure: "drape",
    post: "why-fabric-is-harder-than-pixels",
  },
  {
    slug: "consistency",
    title: "Pose and camera consistency",
    text: "The same garment, consistent across poses and camera angles.",
    problem:
      "People rarely judge a garment from one image. They look at several poses and angles, and increasingly at video. If a print shifts, a colour drifts or a hem jumps between frames, trust in every image drops.",
    hard: [
      "Each generation is sampled independently, so small details vary from run to run.",
      "Parts of the garment hidden in one pose, like the back or the inside of a sleeve, must be invented consistently in the next.",
      "Video adds time: flicker is visible even when every frame looks good on its own.",
    ],
    explore: [
      "A shared garment representation reused across every view.",
      "Multi-view and temporal conditioning.",
      "Evaluation over sets of poses rather than single images.",
    ],
    measure: [
      "Similarity of garment regions across views.",
      "Flicker and drift measures for video.",
      "Human judgement of whole image sets.",
    ],
    figure: "pose",
    post: "pose-consistency-in-garment-generation",
  },
  {
    slug: "speed",
    title: "Fast, affordable inference",
    text: "Generation fast and cheap enough to run on a live storefront.",
    problem:
      "A try-on happens while someone is shopping. If it takes too long they leave, and if each image costs too much a store cannot offer it to every visitor. Speed is a research problem, not only an engineering one, because the fastest ways to sample a model change what it produces.",
    hard: [
      "Diffusion models usually take many denoising steps, and each step is a full pass through a large network.",
      "Few-step distillation can cost fidelity exactly where try-on needs it most: fine detail.",
      "Serving has to hold quality under real traffic, with batching and reduced numerical precision.",
    ],
    explore: [
      "Few-step distillation tuned to preserve detail.",
      "Smaller student models for serving.",
      "Quantisation and batching without visible loss.",
    ],
    measure: [
      "Latency and cost per try-on at a fixed quality bar.",
      "Fidelity before and after distillation, on the same test set.",
      "Quality under realistic load.",
    ],
    figure: "steps",
    post: "fast-enough-for-a-storefront",
  },
];

/** How we do research: principles, stated as intent. */
export const METHOD = [
  { title: "Start from what people see", text: "A research question should begin with a failure someone would notice in a real image, not with a metric." },
  { title: "Build the benchmark before the model", text: "Decide how success is measured, on data the model has never seen, before trying to fix anything." },
  { title: "Change one thing at a time", text: "Ablations over intuition. If we cannot say which change helped, we do not ship it." },
  { title: "Report what we find, including what failed", text: "Negative results and limitations go in the write-up next to the wins." },
  { title: "Ship it, then keep measuring", text: "Work that holds up goes into production, where real use tells us what to study next." },
];

/** The standard we hold training data and outputs to. Stated as a standard, not as an audit result. */
export const RESPONSIBILITY = [
  { title: "Clean data", text: "Every training sample should come from a source we have the right to use, with a record of where it came from." },
  { title: "Consent", text: "Anyone shown in a training image should have agreed to that use in a signed release." },
  { title: "Privacy", text: "Photos shoppers upload to try something on are never used for training." },
  { title: "Transparency", text: "A try-on is a generated image, and it should be presented as one, never as a photograph of a real fitting." },
];
