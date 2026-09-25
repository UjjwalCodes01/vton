import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { MetricsMap } from "../../../_figures/Figures";

export const refs = ["vitonhd", "dresscode", "ssim", "lpips", "dists", "fid", "kid", "clip"];

export const toc = [
  { id: "two-settings", label: "Paired and unpaired" },
  { id: "what-metrics-see", label: "What each metric sees" },
  { id: "what-they-miss", label: "What they miss" },
  { id: "framework", label: "A framework for fidelity" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        How do you know whether a try-on is good? The honest answer is that the standard numbers only tell part of the
        story. A result can score well and still show the wrong logo, a pattern at the wrong scale, or a colour a shade off.
        Those are the errors a shopper notices first, and they are the ones that matter when the image is standing in for
        the real product. This post walks through what the common metrics actually measure, where they fall short for
        texture, and how we think a fidelity benchmark should be built.
      </p>

      <h2 id="two-settings">Paired and unpaired</h2>
      <p>Try-on papers usually report results in two settings.</p>
      <ul>
        <li>
          <strong>Paired.</strong> The model re-dresses a person in the garment they are already wearing. Because the
          original photo is the ground truth, you can compare the output to it pixel by pixel. Test sets such as those
          released with VITON-HD and Dress Code are built this way <C k={["vitonhd", "dresscode"]} />.
        </li>
        <li>
          <strong>Unpaired.</strong> The model puts a different garment on the person. This is the real use case, and
          there is no ground-truth photo to compare against, so only whole-set statistics apply.
        </li>
      </ul>
      <MetricsMap n="Figure 1" />

      <h2 id="what-metrics-see">What each metric sees</h2>
      <h3>SSIM</h3>
      <p>
        The structural similarity index compares local windows of two images on luminance, contrast and structure{" "}
        <C k="ssim" />. It is interpretable and sensitive to blur and misalignment. It also penalizes a result that is
        shifted by a few pixels as harshly as one that is wrong, and it has no notion of which regions matter.
      </p>
      <h3>LPIPS</h3>
      <p>
        LPIPS measures distance between deep network features and was calibrated against human judgements of image
        similarity <C k="lpips" />. It tracks perceived differences better than SSIM, which is why it became standard for
        paired try-on evaluation.
      </p>
      <h3>DISTS</h3>
      <p>
        DISTS was designed to unify structure and texture similarity, with explicit tolerance to texture resampling{" "}
        <C k="dists" />. Two photos of the same grass, sampled differently, score as similar. That is the right behaviour
        for natural textures. For a garment, some of that tolerance is a risk: a printed motif that has moved or changed
        can still look like the same texture.
      </p>
      <h3>FID and KID</h3>
      <p>
        The Fréchet Inception Distance compares the statistics of deep features over a whole set of real images and a whole
        set of generated ones <C k="fid" />. The Kernel Inception Distance does the same with an unbiased estimator that is
        better behaved on smaller sets <C k="kid" />. Both measure whether the generated images, as a population, look like
        real photos. Neither says anything about whether a particular output shows the right garment.
      </p>
      <h3>CLIP similarity</h3>
      <p>
        Embedding the product image and the try-on with CLIP and comparing them gives a semantic similarity score that
        works in the unpaired setting <C k="clip" />. It is good at “is this the same kind of garment?” and weak at “is this
        the same print?”
      </p>

      <h2 id="what-they-miss">What they miss</h2>
      <p>For texture fidelity specifically, the gaps line up:</p>
      <ul>
        <li>
          <strong>Area.</strong> The garment is part of the image, and printed detail is a small part of the garment.
          Whole-image scores average the error away.
        </li>
        <li>
          <strong>Meaning.</strong> A logo with one wrong letter is a large error to a person and a tiny one to a pixel or
          feature distance.
        </li>
        <li>
          <strong>Sets versus samples.</strong> FID and KID can improve while individual results get less faithful, because
          they reward realism across the set, not correctness per image.
        </li>
        <li>
          <strong>Easy pairs.</strong> The paired setting keeps the person’s pose and the garment’s placement, which is the
          easiest case. The hardest cases, new garments on new poses, are the ones with no reference.
        </li>
      </ul>

      <h2 id="framework">A framework for fidelity</h2>
      <p>
        We think a fidelity benchmark should fail a model for the things a shopper would reject. In practice that means
        layering several measurements rather than trusting any single one:
      </p>
      <ol>
        <li>
          <strong>Score the garment, not the image.</strong> Compute paired metrics such as LPIPS and DISTS on the garment
          region only, and separately on its printed and detailed areas.
        </li>
        <li>
          <strong>Check what must be exact.</strong> Text and logos should still read correctly, and colour differences
          should be measured in a perceptual colour space, not by eye.
        </li>
        <li>
          <strong>Keep identity separate.</strong> A try-on that changes the person’s face is a different failure from one
          that changes the shirt, and should be measured on its own.
        </li>
        <li>
          <strong>Ask people.</strong> Side-by-side preference studies with a fixed protocol are the ground truth the other
          numbers are trying to approximate. Automated judges, including vision-language models, are useful for regression
          testing once they have been checked against those human ratings.
        </li>
        <li>
          <strong>Keep the set-level scores as a sanity check.</strong> FID and KID still catch a model whose outputs stop
          looking like photographs at all.
        </li>
      </ol>
      <p>
        None of this is exotic. It is the discipline of measuring the thing you care about, on data the model has not seen,
        before trying to improve it. It is also one of the <Link href="/research">principles we work by</Link>.
      </p>
    </>
  );
}
