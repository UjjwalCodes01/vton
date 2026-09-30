import Link from "next/link";
import { Callout, H2, R, T } from "../_components/Doc";

export const toc = [
  { id: "done", label: "Work already completed" },
  { id: "unlocks", label: "What funding unlocks" },
  { id: "budget", label: "Budget framework" },
  { id: "scenarios", label: "Funding scenarios" },
  { id: "value", label: "Value beyond FabricVTON" },
  { id: "accountability", label: "Accountability" },
  { id: "support", label: "Support the programme" },
];

export const sources = [7, 111];

export function Body() {
  return (
    <>
      <H2 id="done" n="5.1">
        Work already completed without external funding
      </H2>
      <p>
        FabricVTON has self-funded the engineering foundation. The results below were measured on its own infrastructure and
        are documented in its internal technical reports <R n={7} />.
      </p>
      <T
        n="Table 32"
        title="Preliminary work and measured results"
        head={["Capability", "Status", "Measured evidence"]}
        rows={[
          ["Managed GPU try-on service", <span key="tag" className="dx-tag dx-tag--done">Deployed</span>, "60.4 seconds per try-on on an L4 at 768×1152 and 30 steps; about USD 0.019 warm, within rounding of the USD 0.018717 the cost model predicted"],
          ["Speed optimisation", <span key="tag" className="dx-tag dx-tag--done">Service default</span>, "6.5 seconds end to end on an L40S, down from 15.9 seconds, using compilation, 20 steps and guidance only in the final part of sampling; median of three image pairs, 25 September 2026"],
          ["Automatic garment category detection", <span key="tag" className="dx-tag dx-tag--done">Live</span>, "Two independent detectors must agree; the service refuses rather than guesses"],
          ["Realism correction", <span key="tag" className="dx-tag dx-tag--done">On by default</span>, "Removes the pale halo around the person, at a cost of about 0.4 seconds"],
          ["Request batching", <span key="tag" className="dx-tag dx-tag--done">Implemented</span>, "Up to four requests share one diffusion loop, each with its own random generator"],
          ["Portable worker container", <span key="tag" className="dx-tag dx-tag--done">Built and self-checked</span>, "GPU, ONNX Runtime and checksum-verified weights pass the self-check"],
          ["Live try-on page", <span key="tag" className="dx-tag dx-tag--partial">Built, on a rented engine</span>, "Browser camera, consent screen, 90-second session limit, one-time session tokens and garment switching, running on a licensed third-party live engine at USD 1.20 a minute"],
          ["Safety guardrail plan", <span key="tag" className="dx-tag dx-tag--partial">Written</span>, <>Eleven guardrails for photo and live try-on, with a cloud design and a tested decision function <R n={111} /></>],
        ]}
      />
      <p>
        What the company cannot fund today is exactly what the research needs most: licensed photo and video data of garments
        from many regions on diverse bodies, systematic human evaluation, video training compute, and sustained research staff.
      </p>

      <H2 id="unlocks" n="5.2">
        What funding unlocks
      </H2>
      <T
        n="Table 33"
        title="Capabilities with and without funding"
        head={["Area", "Without funding", "With funding"]}
        rows={[
          ["Data", "No licensed data across garment families, regions, skin tones and body shapes, and no consented video", "Licensed photoshoots and video shoots, catalogue, stock and footage licences, and consented subjects across regions, skin tones and body shapes"],
          ["Human evaluation", "Quality judged by eye on a few image pairs", "A paid panel of raters from several regions, with measured agreement, for photos and video"],
          ["Compute", "Short benchmark runs", "Image and video training, ablations, synthetic data generation, distillation and live serving tests"],
          ["People", "Part-time volunteers", "Funded research fellows and engineers for the length of the programme"],
          ["Live try-on", "A rented engine at USD 1.20 a minute", "FabricVTON's own live model, targeting under a tenth of that cost"],
          ["Dissemination", "arXiv preprints only", "Open-access publication, conference registration and benchmark hosting"],
        ]}
      />

      <H2 id="budget" n="5.3">
        Budget framework
      </H2>
      <p>
        The table below fixes quantities and allocation principles. Unit costs for photography, video shoots, annotation and
        stipends vary by city and by scheme rules, so they are quoted for each application; shooting in India lowers them
        considerably. Compute is estimated from measured and list rates in the{" "}
        <Link href="/docs/video-and-live-models#compute">compute estimate</Link>.
      </p>
      <T
        n="Table 34"
        title="Budget categories and indicative allocation"
        head={["Category", "Pays for", "Basis", "Indicative share"]}
        rows={[
          ["Research personnel", "Research fellows and engineers", "Six to eight roles for eighteen months, part-time where appropriate", "35%"],
          ["Data acquisition and licensing", "Photoshoots, video shoots, releases, and catalogue, stock and footage licences", "2,000 image test pairs, 20,000 image training pairs, a Tier A video set of about 800 looks, and 150 hours of licensed footage", "30%"],
          ["Compute", "Audit, synthetic data, image and video training, distillation and live serving tests", "USD 60,000 to 105,000", "15%"],
          ["Annotation and human evaluation", "Attribute labels, video quality checks and the rater panel", "Three raters per judgement on at least 2,000 image items and 300 video clips", "8%"],
          ["Dissemination and open release", "Open-access fees, registration and hosting", "Four papers and two public releases", "4%"],
          ["Legal, ethics and compliance", "Consent and release forms, licence register, data protection and guardrails", "Before collection, before release and before live launch", "3%"],
          ["Contingency", "Price changes and re-runs", "Standard reserve", "5%"],
        ]}
      />
      <div className="dx-share" data-reveal aria-hidden="true">
        {[
          ["Personnel", 35],
          ["Data", 30],
          ["Compute", 15],
          ["Evaluation", 8],
          ["Contingency", 5],
          ["Dissemination", 4],
          ["Legal", 3],
        ].map(([k, v], i) => (
          <span key={k as string} className={`dx-share-${i}`} style={{ flexGrow: v as number, transitionDelay: `${i * 80}ms` }}>
            <b>{v}%</b>
            <em>{k}</em>
          </span>
        ))}
      </div>

      <H2 id="scenarios" n="5.4">
        Funding scenarios
      </H2>
      <T
        n="Table 35"
        title="What each funding level delivers"
        head={["Scenario", "Work funded", "Outputs"]}
        rows={[
          ["Core", "WP1, WP2 and WP3", "Paper 1, the benchmark, the evaluation toolkit and a first image model"],
          ["Video", "Core plus WP4 and WP6, with a Tier A video set", "Papers 1 to 3, a distilled image model and an offline video try-on model"],
          ["Full", "All seven work packages", "All four papers, the benchmark and toolkit, the image and video models, and live try-on on FabricVTON's own model"],
        ]}
        note="If an award is smaller than the full programme, the image track and the video data engine are funded first, because the video model depends on both."
      />

      <H2 id="value" n="5.5">
        Value beyond FabricVTON
      </H2>
      <ul>
        <li>A public benchmark covering garments from many regions, real shoppers&apos; photos, and the full range of skin tones and body shapes, which any researcher or company can use to test their models.</li>
        <li>An open evaluation toolkit, including skin-tone drift and body-distortion measures.</li>
        <li>The first evidence on how fairly try-on models treat shoppers across skin tones and body shapes.</li>
        <li>Researchers trained in modern generative image and video models, through funded fellowships.</li>
        <li>A candidate dataset for IndiaAI&apos;s public dataset platform, AIKosh, subject to consent terms.</li>
        <li>A video hold-out for try-on with long clips and live-camera stress conditions, which no public benchmark covers.</li>
      </ul>

      <H2 id="accountability" n="5.6">
        Accountability
      </H2>
      <p>
        Funds will be tied to the milestones in the <Link href="/docs/roadmap#schedule">roadmap</Link>. FabricVTON will send
        quarterly progress reports with the <Link href="/docs/outputs#kpis">key performance indicators</Link>, publish negative
        results as well as positive ones, and keep expenditure records to each scheme&apos;s audit standard.
      </p>

      <H2 id="support" n="5.7">
        Support the programme
      </H2>
      <Callout label="For funders, investors and compute partners" tone="accent">
        <p>
          FabricVTON welcomes research grant programmes, compute partners and investors. If you would like the full proposal,
          the budget for a specific scheme, or a conversation with the founders, <Link href="/investors">get in touch through
          the investors page</Link> or <Link href="/contact">contact us</Link>.
        </p>
      </Callout>
    </>
  );
}
