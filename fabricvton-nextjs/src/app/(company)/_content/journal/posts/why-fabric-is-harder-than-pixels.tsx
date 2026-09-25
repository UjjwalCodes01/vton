import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { DrapeFigure, FabricFour } from "../../../_figures/Figures";

export const refs = ["ldm", "deschaintre2018", "baraff1998", "snug", "hood", "hrviton", "mmvto"];

export const toc = [
  { id: "print", label: "Print and logos" },
  { id: "material", label: "Weave and sheen" },
  { id: "drape", label: "Drape and folds" },
  { id: "layers", label: "Layers and occlusion" },
  { id: "so-what", label: "What this means" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        An image model sees a shirt as pixels. A person sees a material: cotton or silk, heavy or light, a woven check or
        a printed logo, cut close to the body or falling loose. Virtual try-on sits between the two. It has to produce
        pixels, but it is only useful if those pixels behave like the material would. That is why we think of try-on as a
        physical problem that happens to be solved in image space, and why fabric is harder than it looks.
      </p>
      <p>Four properties do most of the damage when they go wrong.</p>
      <FabricFour n="Figure 1" />

      <h2 id="print">Print and logos</h2>
      <p>
        Printed detail is high-frequency, it is small, and it is rigid in meaning. A stripe can bend with the fabric; a
        letter cannot turn into a different letter. A shopper will forgive a slightly wrong shadow long before they forgive
        a misspelled brand name.
      </p>
      <p>
        Modern generators make this harder in a specific way. Latent diffusion models do not work on pixels directly. An
        autoencoder first compresses the image into a smaller latent grid, eight times smaller in each dimension in the
        widely used Stable Diffusion setup, and generation happens there <C k="ldm" />. That compression is what makes
        high-resolution generation affordable. It is also a bottleneck for exactly the detail try-on needs to carry: a
        small logo may span only a few latent cells before the generator does anything at all.
      </p>

      <h2 id="material">Weave and sheen</h2>
      <p>
        How fabric looks depends on its structure and on light. A twill weave throws diagonal highlights, satin reflects
        like a soft mirror, and a knit scatters light in its loops. Graphics describes this with reflectance models, and
        learned methods can now estimate those reflectance maps from a single photograph of a surface{" "}
        <C k="deschaintre2018" />.
      </p>
      <p>
        A product photo gives one view under one lighting setup. The try-on image usually has different light, a different
        angle and a curved surface. A model that has only learned “this garment is dark blue” will get the colour right and
        the fabric wrong: a flat, plastic-looking result where there should be the soft sheen of wool or the crisp surface
        of cotton.
      </p>

      <h2 id="drape">Drape and folds</h2>
      <p>
        Drape is how a fabric hangs, and it is governed by physics: how much the material stretches, how stiffly it resists
        bending, and how much it weighs. The same dress falls differently on different bodies, and a heavy coat and a light
        blouse fall differently on the same body.
      </p>
      <DrapeFigure n="Figure 2" />
      <p>
        Cloth simulation has modelled this for decades. Implicit integration made simulation stable enough to take large
        time steps <C k="baraff1998" />, and it remains a foundation of the field. Learning-based methods now model garment
        dynamics too: SNUG trains neural garment models with physics-based losses instead of simulated data{" "}
        <C k="snug" />, and HOOD uses a hierarchical graph network that generalizes to garments it has not seen{" "}
        <C k="hood" />.
      </p>
      <p>
        Image-based try-on has none of the inputs these methods expect. There is no 3D sewing pattern and no material
        parameters, only a photograph. The model has to infer, from appearance alone, roughly how the fabric would behave on
        this particular body. When it cannot, it tends to copy the folds from the product photo, which is why so many
        try-ons look like the garment was pasted on.
      </p>

      <h2 id="layers">Layers and occlusion</h2>
      <p>
        Real outfits overlap. A shirt is tucked or left out, a jacket hangs open, hair falls over a collar, a hand rests in a
        pocket, a bag strap crosses the chest. The model has to decide what is in front of what, and how contact changes
        shape. Warping-based systems addressed occlusion explicitly when fitting the garment <C k="hrviton" />, and newer
        work lets a user control how several garments are layered and styled <C k="mmvto" />. Getting it right on arbitrary
        photos of real people is still open.
      </p>

      <h2 id="so-what">What this means</h2>
      <p>For us, taking fabric seriously has three consequences.</p>
      <ul>
        <li>
          <strong>Evaluate the garment, not just the image.</strong> Scores averaged over a whole picture barely notice a
          wrong logo. We look at the garment region, and at printed detail specifically. More in{" "}
          <Link href="/journal/evaluating-texture-fidelity-in-vto">Evaluating texture fidelity</Link>.
        </li>
        <li>
          <strong>Carry detail explicitly.</strong> Fine detail should have its own path through the model instead of
          relying on a compressed latent to preserve it.
        </li>
        <li>
          <strong>Bring physics back in.</strong> Priors from simulation and from material understanding can inform drape
          where a single photo cannot.
        </li>
      </ul>
      <p>
        These map directly onto two of our <Link href="/research/open-problems">open problems</Link>: fidelity through warping,
        and drape.
      </p>
    </>
  );
}
