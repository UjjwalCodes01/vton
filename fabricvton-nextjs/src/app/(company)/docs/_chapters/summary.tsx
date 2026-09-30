import Link from "next/link";
import { Callout, H2, R, T } from "../_components/Doc";

export const toc = [
  { id: "overview", label: "The programme" },
  { id: "problem", label: "The problem" },
  { id: "where-we-stand", label: "Where FabricVTON stands" },
  { id: "approach", label: "The approach" },
  { id: "outputs", label: "Outputs" },
  { id: "at-a-glance", label: "At a glance" },
];

export const sources = [1, 2, 3, 4, 5, 7, 12, 13, 70, 71];

export function Body() {
  return (
    <>
      <p className="dx-lede">
        FabricVTON is an early-stage Indian company building photorealistic virtual try-on for fashion e-commerce
        worldwide. This programme has one end goal: <strong>live video try-on</strong>, in which shoppers see themselves
        wearing a garment on their own camera, in real time, for any garment and any body.
      </p>

      <H2 id="overview" n="0.1">
        The programme
      </H2>
      <p>
        The research runs for eighteen months. It builds image try-on first, because the image model becomes the teacher
        for the video model. Along the way it closes a gap the research community has left open: try-on that works
        equally well for every garment and every shopper, whatever their skin tone, body shape or region.
      </p>

      <H2 id="problem" n="0.2">
        The problem
      </H2>
      <p>
        About one in four online apparel orders in the United States is returned, and size and fit is the most-cited reason{" "}
        <R n={1} />. Virtual try-on is the industry&apos;s response, and it is now mainstream across markets: Google offers it
        in Search in the United States, the United Kingdom and India, Inditex runs Zara Try-On in 43 markets, and Alibaba
        serves it to millions of Taobao users <R n={[2, 3, 12, 13]} />.
      </p>
      <p>
        Yet research models are trained and scored almost entirely on a narrow wardrobe of stitched studio garments, from
        datasets whose terms forbid commercial use <R n={[4, 5]} />, and no published work audits them by skin tone or body
        shape. Live try-on has only just become possible, and only on closed engines: the leading live try-on model costs
        USD 1.20 a minute, about a hundred times the cost of a photo try-on on FabricVTON&apos;s own infrastructure{" "}
        <R n={[7, 70]} />. The one open research system for live video try-on runs at 512×384 and has not released its code{" "}
        <R n={71} />.
      </p>

      <H2 id="where-we-stand" n="0.3">
        Where FabricVTON stands
      </H2>
      <p>
        FabricVTON already operates a production photo try-on service on its own GPU infrastructure, built on an open,
        permissively licensed try-on model. On that infrastructure a photo try-on takes about 6.5 seconds on an NVIDIA L40S
        GPU and costs about USD 0.019 on an NVIDIA L4 <R n={7} />. It has also built a live try-on page with a consent
        screen, a session time limit and one-time session tokens, currently running on a licensed third-party engine. The
        programme therefore starts with a working baseline, a measurement harness, a permissively licensed teacher model and
        a live shell ready for its own engine.
      </p>

      <H2 id="approach" n="0.4">
        The approach
      </H2>
      <p>The programme has two tracks.</p>
      <ul>
        <li>
          <strong>The image track</strong> builds a licensed and consented benchmark of at least 2,000 try-on pairs across at
          least eight garment families from at least five world regions, audits at least ten current systems for fairness,
          and fine-tunes FabricVTON&apos;s own image model on Qwen-Image-Edit-2511, an Apache-2.0 image editor.
        </li>
        <li>
          <strong>The video track</strong>, the end goal, uses that image model as a teacher: it re-dresses real, consented
          video clips to make training pairs, trains a video try-on model on the Apache-2.0 Wan2.1 video model, and then
          converts it into a live model that draws each frame from the camera frame, a memory of the garment and its own
          recent frames, at 15 or more frames per second on one GPU.
        </li>
      </ul>

      <H2 id="outputs" n="0.5">
        Outputs
      </H2>
      <p>
        Four peer-reviewed papers, a public benchmark with image and video splits, an open evaluation toolkit, commercially
        usable image and video try-on models, and live try-on on FabricVTON&apos;s own model at an estimated tenth of the
        rented engine&apos;s cost or less. Compute is estimated at USD 60,000 to 105,000. Funding would also pay for photo and
        video data, human evaluation and research personnel, none of which the company can fund today. See{" "}
        <Link href="/docs/funding">What funding enables</Link>.
      </p>

      <H2 id="at-a-glance" n="0.6">
        At a glance
      </H2>
      <T
        n="Table 1"
        title="Programme at a glance"
        head={["Item", "Summary"]}
        rows={[
          ["Research area", "Generative computer vision for inclusive image, video and live virtual try-on of any garment, for every body"],
          ["End goal", "Live video try-on on FabricVTON's own model, at 15 or more frames per second on one GPU"],
          ["Duration", "18 months in seven phases, with fifteen milestones"],
          ["Image model", "Qwen-Image-Edit-2511 (Apache-2.0), distilled into FLUX.2 klein base 4B (Apache-2.0)"],
          ["Video and live models", "Wan2.1 (Apache-2.0): a 14B offline model and teacher, and a 1.3B causal live student"],
          ["Benchmark", "At least 2,000 licensed image test pairs across at least eight garment families from at least five world regions, and a 300-clip video hold-out including live-camera conditions, stratified by skin tone and body shape"],
          ["Audit", "At least ten open and commercial try-on systems"],
          ["Publications", "Four papers, plus an optional technical report on serving cost"],
          ["Compute estimate", "USD 60,000 to 105,000"],
          ["Existing assets", "Production photo deployment, measured speed and cost, evaluation and speed tooling, and a live try-on page on a rented engine"],
        ]}
      />
      <Callout label="Status" tone="accent">
        This is a proposal. Figures marked as measured come from FabricVTON&apos;s own infrastructure; all targets are
        proposed, not results.
      </Callout>
    </>
  );
}
