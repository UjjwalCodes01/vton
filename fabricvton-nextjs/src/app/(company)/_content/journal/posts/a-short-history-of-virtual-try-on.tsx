import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { TryOnTask, VtonTimeline, WarpVsAttention } from "../../../_figures/Figures";

export const refs = [
  "viton",
  "cpvton",
  "vitonhd",
  "hrviton",
  "tryondiffusion",
  "ladivton",
  "stableviton",
  "idmvton",
  "ootdiffusion",
  "catvton",
  "mmvto",
  "dresscode",
];

export const toc = [
  { id: "the-task", label: "The task" },
  { id: "warp-then-blend", label: "Warp, then blend" },
  { id: "generate-with-attention", label: "Generate with attention" },
  { id: "the-data", label: "The data behind it" },
  { id: "still-unsolved", label: "What is still unsolved" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        Virtual try-on asks a question that sounds simple: given a photo of a person and a photo of a garment, what would
        that person look like wearing it? In its modern, image-based form the research field is less than a decade old.
        In that time it has already been through one complete change of method, from explicitly warping product images
        onto bodies to diffusion models that learn the correspondence for themselves. This is a short tour of how it got
        here, and of what is still open.
      </p>

      <h2 id="the-task">The task</h2>
      <p>
        A try-on system receives two images and must produce a third. From the person photo it has to keep almost
        everything: face and identity, pose, body shape, skin, hair and the background. From the product photo it has to
        take the garment: its shape, colour, fabric, print and details. The output has to look like a real photograph,
        and it has to be faithful to both inputs at once.
      </p>
      <TryOnTask n="Figure 1" />
      <p>
        One idea runs through almost every system since the first: remove the old clothing from the person before adding
        the new. VITON <C k="viton" /> called this a <em>clothing-agnostic</em> person representation. It keeps pose
        keypoints, a coarse body-shape mask and the face and hair, and throws away what the person was wearing, so that
        the model cannot simply copy it back.
      </p>

      <h2 id="warp-then-blend">Warp, then blend (2018–2022)</h2>
      <p>
        The first generation of systems split the problem in two: geometrically deform the product image to fit the body,
        then blend it into the person. VITON produced a coarse result first, then warped the garment with a thin-plate
        spline (TPS), a smooth deformation controlled by a grid of points, and used a refinement network to blend the
        warped garment into the coarse image <C k="viton" />. Its warp came from classical shape matching. CP-VTON made
        the warp learnable, with a Geometric Matching Module that predicts the TPS transform, and a try-on module that
        learns a composition mask deciding, pixel by pixel, how much of the warped cloth to use <C k="cpvton" />.
      </p>
      <p>
        Resolution and robustness came next. VITON-HD generated images at 1024×768 and introduced a normalization
        designed for the regions where the warped garment and the body do not line up <C k="vitonhd" />. HR-VITON
        performed warping and segmentation in a single module, to handle misalignment and the occlusions that make a
        garment look squeezed where the body covers it <C k="hrviton" />.
      </p>
      <WarpVsAttention n="Figure 2" />
      <p>
        Explicit warping has a real strength. When the pose is close to the product photo, it carries texture across
        almost untouched, because it is literally moving the original pixels. Its weakness is everything a single smooth
        warp cannot express: large pose changes, arms crossing the body, loose garments, layers. And the blending networks
        of the time, mostly GANs, left visible seams and artifacts when the warp was wrong.
      </p>

      <h2 id="generate-with-attention">Generate with attention (2023 onwards)</h2>
      <p>
        Diffusion models changed the approach. TryOnDiffusion used two UNets working in parallel, one for the person and
        one for the garment, and let cross-attention warp the garment implicitly. There is no explicit geometric
        transform; the network learns which part of the garment belongs where <C k="tryondiffusion" />. It handled large
        changes in pose and body shape, and a cascade of diffusion models brought the output to 1024×1024.
      </p>
      <p>A burst of work followed, mostly built on large pre-trained latent diffusion models:</p>
      <ul>
        <li>
          <strong>LaDI-VTON</strong> added textual inversion, mapping garment features into the text-token space the
          diffusion model already understands <C k="ladivton" />.
        </li>
        <li>
          <strong>StableVITON</strong> learned the correspondence between clothing and body with zero-initialized
          cross-attention blocks inside a pre-trained model’s latent space <C k="stableviton" />.
        </li>
        <li>
          <strong>IDM-VTON</strong> split the garment signal in two: high-level semantics through an image-prompt adapter,
          and low-level detail through a parallel garment UNet <C k="idmvton" />.
        </li>
        <li>
          <strong>OOTDiffusion</strong> learned garment features in an outfitting UNet and fused them into the denoising
          network through self-attention <C k="ootdiffusion" />.
        </li>
        <li>
          <strong>CatVTON</strong> went the other way on complexity: it simply concatenates the garment and person images
          side by side, with no extra image encoder, and trains only a small fraction of the model’s parameters{" "}
          <C k="catvton" />.
        </li>
        <li>
          <strong>M&amp;M VTO</strong> moved beyond single garments to full outfits, with the layout controlled by text{" "}
          <C k="mmvto" />.
        </li>
      </ul>
      <VtonTimeline n="Figure 3" />
      <p>
        Diffusion brought large gains in realism and in robustness to pose. It also moved the hard problems. When a
        network, rather than a warp, decides where every thread goes, fine detail has to survive the model’s compressed
        latent space and many steps of denoising, and small text and logos are exactly what tends not to.
      </p>

      <h2 id="the-data">The data behind it</h2>
      <p>
        Progress in the field has been driven by a small number of public datasets of paired images: a garment, and a
        person wearing it. VITON-HD released one alongside its paper, and Dress Code extended coverage from tops to
        lower-body garments and dresses <C k="dresscode" />. They made the research possible. They are also licensed for
        non-commercial or academic use only, which matters a great deal for anyone building a product. We come back to
        this in <Link href="/journal/where-training-data-comes-from">Where training data comes from</Link>.
      </p>

      <h2 id="still-unsolved">What is still unsolved</h2>
      <p>Today’s best systems produce images that look real. Looking real is not the same as being right. What remains hard:</p>
      <ul>
        <li>
          <strong>Fine detail.</strong> Printed text, logos and small patterns are still the first things to break.
        </li>
        <li>
          <strong>Fit and drape.</strong> How a specific fabric hangs on a specific body is mostly guessed, not reasoned
          about.
        </li>
        <li>
          <strong>Consistency.</strong> The same outfit in two poses, or across a video, often disagrees with itself.
        </li>
        <li>
          <strong>Speed.</strong> Many denoising steps with large networks are expensive to run for every shopper.
        </li>
      </ul>
      <p>
        These are the problems our research team works on. Each has its own write-up on our{" "}
        <Link href="/research/open-problems">open problems</Link> page.
      </p>
    </>
  );
}
