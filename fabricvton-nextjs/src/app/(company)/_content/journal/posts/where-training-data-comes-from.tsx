import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { ProvenanceFlow } from "../../../_figures/Figures";

export const refs = ["vitonhd", "dresscode", "c2pa", "euaiact"];

export const toc = [
  { id: "public-datasets", label: "The public datasets" },
  { id: "provenance", label: "Provenance" },
  { id: "consent", label: "Consent" },
  { id: "shopper-photos", label: "Shopper photos" },
  { id: "labelling", label: "Labelling what is generated" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        A try-on model learns from pairs: a garment, and a person wearing it. Where those images come from decides more
        than quality. It decides whether a model can be used commercially at all, whether the people in the images agreed
        to be there, and whether the businesses and shoppers using the product can trust it. This post is about how we
        think about that, and why it shapes how a commercial try-on model has to be built.
      </p>

      <h2 id="public-datasets">The public datasets</h2>
      <p>
        The research field grew up on a few public datasets, and they were essential to its progress. They are also, by
        design, not for commercial use. The dataset released with VITON-HD is under a Creative Commons non-commercial
        licence <C k="vitonhd" />. Dress Code, which extended coverage to lower-body garments and dresses, restricts use to
        academic, non-commercial research, teaching and publication <C k="dresscode" />.
      </p>
      <p>
        Those terms are reasonable for datasets built from fashion imagery for research. For anyone building a product,
        they mean the most convenient training data is off the table. We read those licences as ruling out training a model
        we sell to businesses, and we think the field is better for being clear about it.
      </p>

      <h2 id="provenance">Provenance</h2>
      <p>
        The alternative is slower and more expensive: build data you have the right to use, and keep a record of where
        every sample came from. In practice that means a mix of sources, such as catalogue images licensed by their owners
        for training, photo shoots commissioned for the purpose, and synthetic images rendered from 3D garments.
      </p>
      <ProvenanceFlow n="Figure 1" />
      <p>
        Per-sample lineage sounds like bookkeeping, and it is. It is also what lets you answer, for any image, “where did
        this come from, and under what terms?” That question comes up in partnerships, in audits and in any serious due
        diligence, and it is very hard to answer after the fact.
      </p>

      <h2 id="consent">Consent</h2>
      <p>
        Try-on data is full of people. A person in a training image should have agreed to that use, through a signed release
        that covers training machine-learning models. That is a higher bar than the permission needed to show a photo on a
        product page, and it has to be designed into a shoot from the start, not added later.
      </p>

      <h2 id="shopper-photos">Shopper photos</h2>
      <p>
        There is one source of images we deliberately keep out of training: the photos shoppers upload to try something on.
        People share those photos to see a product on themselves, not to improve anyone’s model. The try-on is what they
        asked for, and that is all the photo is used for. Our{" "}
        <Link href="/widget-privacy">shopper privacy notice</Link> sets out exactly how those photos are handled.
      </p>

      <h2 id="labelling">Labelling what is generated</h2>
      <p>
        A try-on image is generated. It shows how a garment could look, not a photograph of a real fitting, and it should be
        presented that way. Open standards for content provenance, such as C2PA’s Content Credentials, let images carry
        a record of their origin and edits <C k="c2pa" />. Regulation is moving the same way: the EU AI Act’s transparency
        rules in Article 50, which apply from August 2026, include obligations to mark AI-generated images{" "}
        <C k="euaiact" />.
      </p>
      <p>
        We think these are good constraints. A model built on clean data, with clear consent, that keeps shoppers’ photos
        private and labels its output honestly is one that people and businesses can rely on. That is the kind of model we
        want to build.
      </p>
    </>
  );
}
