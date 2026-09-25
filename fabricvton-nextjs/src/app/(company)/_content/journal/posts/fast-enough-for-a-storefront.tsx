import Link from "next/link";
import { Cite } from "../../../_components/Blocks";
import { StepsFigure } from "../../../_figures/Figures";

export const refs = ["ldm", "tryondiffusion", "idmvton", "progdistill", "consistency", "lcm", "add"];

export const toc = [
  { id: "why-slow", label: "Why diffusion is slow" },
  { id: "distillation", label: "Fewer steps: distillation" },
  { id: "the-cost", label: "What speed costs" },
  { id: "beyond-steps", label: "Beyond step count" },
];

const C = ({ k }: { k: string | string[] }) => <Cite k={k} keys={refs} />;

export function Body() {
  return (
    <>
      <p>
        A try-on happens in the middle of shopping. The person has a product page open and a decision to make. If the
        image takes too long they move on, and if every image costs too much a store cannot offer try-on to every visitor.
        So speed and cost are not details to fix after the research is done. They decide whether the research reaches
        anyone at all, and the fastest ways to run a model change what it produces.
      </p>

      <h2 id="why-slow">Why diffusion is slow</h2>
      <p>
        A diffusion model generates an image by starting from noise and removing it step by step. Each step is a full pass
        through a large neural network, and standard samplers take many steps. Latent diffusion made each step cheaper by
        working in a compressed latent space rather than on pixels <C k="ldm" />, but the iterative structure remains.
      </p>
      <p>
        Try-on adds more work per step. Many strong systems process the garment in its own network branch alongside the
        person, like the parallel UNets of TryOnDiffusion <C k="tryondiffusion" /> or IDM-VTON’s garment network{" "}
        <C k="idmvton" />, and high output resolutions multiply the cost again.
      </p>
      <StepsFigure n="Figure 1" />

      <h2 id="distillation">Fewer steps: distillation</h2>
      <p>
        The most effective lever is to take fewer steps. Distillation trains a fast “student” model to match what a slow
        “teacher” produces with many steps. A few landmarks:
      </p>
      <ul>
        <li>
          <strong>Progressive distillation</strong> repeatedly trains a student to do in one step what the teacher did in
          two, halving the step count each round <C k="progdistill" />.
        </li>
        <li>
          <strong>Consistency models</strong> learn to map any point along the denoising path directly to its end, which
          allows generation in a single step or a few <C k="consistency" />.
        </li>
        <li>
          <strong>Latent consistency models</strong> brought that idea to latent diffusion, producing high-resolution
          images in about two to four steps <C k="lcm" />.
        </li>
        <li>
          <strong>Adversarial diffusion distillation</strong> combines distillation with an adversarial loss, sampling in
          one to four steps <C k="add" />.
        </li>
      </ul>

      <h2 id="the-cost">What speed costs</h2>
      <p>
        Fewer steps are not free. Few-step students can lose fine detail and variety compared with their teachers, and for
        try-on, fine detail is exactly where fidelity lives: the print, the logo, the weave. A distilled model that looks
        just as good on average and quietly softens every logo is a worse product.
      </p>
      <p>
        So distillation has to be judged with the same fidelity measures as the original model, on the same held-out test
        set, with particular attention to garment regions and printed detail. We described those measures in{" "}
        <Link href="/journal/evaluating-texture-fidelity-in-vto">Evaluating texture fidelity</Link>. A speed-up only counts if
        fidelity holds.
      </p>

      <h2 id="beyond-steps">Beyond step count</h2>
      <p>Step count is the biggest lever, not the only one:</p>
      <ul>
        <li>
          <strong>Smaller students.</strong> The student does not have to be the same size as the teacher.
        </li>
        <li>
          <strong>Lower precision.</strong> Running weights and activations at reduced numerical precision cuts memory and
          time, if quality is checked after the change.
        </li>
        <li>
          <strong>Batching.</strong> Serving many requests together keeps hardware busy under real traffic.
        </li>
        <li>
          <strong>Reuse what does not change.</strong> In try-on, many shoppers try the same product. Work that depends only
          on the garment is an opportunity to compute once and reuse.
        </li>
      </ul>
      <p>
        Fast, affordable inference is one of our four <Link href="/research/open-problems">open problems</Link>, and the one
        that most directly decides who gets to use everything else we build.
      </p>
    </>
  );
}
