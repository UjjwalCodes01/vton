import { Callout, H2, Points, T } from "../_components/Doc";

export const toc = [
  { id: "publications", label: "Publications" },
  { id: "datasets", label: "Datasets and benchmark" },
  { id: "models", label: "Models" },
  { id: "software", label: "Software" },
  { id: "kpis", label: "Key performance indicators" },
  { id: "open-science", label: "IP and open science" },
  { id: "conclusion", label: "Conclusion" },
];

export const sources: number[] = [];

export function Body() {
  return (
    <>
      <H2 id="publications" n="6.1">
        Publications
      </H2>
      <div className="dx-papers">
        {[
          { n: "Paper 1", t: "Every Garment, Every Body: A Global Benchmark and Fairness Audit of Virtual Try-On", v: "CVPR 2027 workshop; NeurIPS 2027 Evaluations and Datasets", m: "Month 6 to 7" },
          { n: "Paper 2", t: "Any Garment, Any View: Multi-View Pseudo-Paired Adaptation of Image-Editing Models for Virtual Try-On", v: "ACM Multimedia 2027, BMVC 2027 or WACV 2028", m: "Month 10" },
          { n: "Paper 3", t: "Taught by Photos: Commercially Clean Synthetic Pairs for Garment-Faithful Video Try-On", v: "CVPR 2028", m: "Month 14" },
          { n: "Paper 4", t: "Live Try-On: Garment-Faithful Streaming Virtual Try-On on One GPU", v: "ECCV 2028 or SIGGRAPH 2028", m: "Month 17 to 18" },
        ].map((p, i) => (
          <article key={p.n} className="dx-paper" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="dx-paper-n">{p.n}</span>
            <h3>{p.t}</h3>
            <p>{p.v}</p>
            <em>{p.m}</em>
          </article>
        ))}
      </div>
      <T
        n="Table 37"
        title="Planned publications"
        head={["Output", "Working title", "Contribution", "Target venue", "Month"]}
        rows={[
          ["Paper 1", "Every Garment, Every Body: A Global Benchmark and Fairness Audit of Virtual Try-On", "First licensed try-on benchmark spanning garment families from several regions, with garment attributes, photo conditions and fairness strata; audit of at least ten systems; judge calibration study", "CVPR 2027 workshop; NeurIPS 2027 Evaluations and Datasets", "6 to 7"],
          ["Paper 2", "Any Garment, Any View: Multi-View Pseudo-Paired Adaptation of Image-Editing Models for Virtual Try-On", "Data engine for garments beyond stitched studio wear; multi-view garment conditioning; distilled student model", "ACM Multimedia 2027, BMVC 2027 or WACV 2028", "10"],
          ["Paper 3", "Taught by Photos: Commercially Clean Synthetic Pairs for Garment-Faithful Video Try-On", "Video data engine in which the image model re-dresses real clips; multi-view garment memory; a print and logo stability measure for video", "CVPR 2028", "14"],
          ["Paper 4", "Live Try-On: Garment-Faithful Streaming Virtual Try-On on One GPU", "Causal student with persistent garment memory and self-forcing training; a live-camera benchmark; cost per stream-minute", "ECCV 2028 or SIGGRAPH 2028", "17 to 18"],
          ["Technical report (optional)", "Cost-Aware Serving of Virtual Try-On on Commodity GPUs", "Quality, latency and cost trade-offs for photo and live try-on, with blind human evaluation", "arXiv; WACV applications track", "4 to 6"],
        ]}
      />

      <H2 id="datasets" n="6.2">
        Datasets and benchmark
      </H2>
      <Points
        items={[
          { k: "Global try-on benchmark.", t: "At least 2,000 consented test pairs across at least eight garment families from at least five world regions, with garment attribute labels, garment-presentation and photo-condition variants, and skin-tone and body-shape strata. Released for research with a datasheet." },
          { k: "Human rating set.", t: "Pairwise preferences and attribute judgements from raters in several regions, released to support calibration of automatic judges." },
          { k: "Proprietary training corpus.", t: "At least 20,000 licensed and synthetic pairs with a full provenance ledger. Kept private because licences and consents cover training, not redistribution." },
          { k: "Video hold-out.", t: "About 300 consented clips in studio, phone and live-camera conditions, with people and garments kept out of training. Released for research with a datasheet." },
          { k: "Proprietary video corpus.", t: "At least 7,000 real clips and 20,000 verified synthetic video pairs with a full provenance ledger. Kept private for the same reason as the image corpus." },
        ]}
      />

      <H2 id="models" n="6.3">
        Models
      </H2>
      <Points
        items={[
          { k: "Research model.", t: "A LoRA fine-tune of Qwen-Image-Edit-2511 for try-on of any garment, used for Paper 2." },
          { k: "Production model.", t: "A distilled student on FLUX.2 klein base 4B, deployed in FabricVTON's service once it beats the current model on the benchmark." },
          { k: "Video try-on model.", t: "An offline model on Wan2.1 14B for garment-faithful video try-on, used for Paper 3 and as the live teacher." },
          { k: "Live try-on model.", t: "A 1.3B causal student served over WebRTC behind FabricVTON's existing live page, replacing the rented engine once it wins on the hold-out." },
          { k: "Baseline results.", t: "Published scores for at least ten existing systems on the benchmark." },
        ]}
      />

      <H2 id="software" n="6.4">
        Software
      </H2>
      <Points
        items={[
          { k: "Evaluation toolkit,", t: "released open source under Apache-2.0, with the garment-attribute, skin-tone drift and body-distortion measures." },
          { k: "Judge calibration scripts", t: "that measure agreement between automatic judges and human raters." },
          { k: "Speed and cost laboratory", t: "for measuring latency and cost per try-on on cloud GPUs." },
          { k: "Live evaluation harness", t: "that measures time to first frame, sustained frame rate, frame latency and drift on the live-camera stress clips." },
        ]}
      />

      <H2 id="kpis" n="6.5">
        Key performance indicators
      </H2>
      <T
        n="Table 38"
        title="Key performance indicators"
        head={["Indicator", "Target", "Evidence", "Month"]}
        rows={[
          ["Benchmark size", "At least 2,000 image test pairs across at least eight garment families from at least five world regions", "Datasheet", "5"],
          ["Fairness coverage", "Subjects balanced across all ten Monk Skin Tone groups and across body shapes, including plus sizes", "Datasheet", "5"],
          ["Systems audited", "At least ten", "Paper 1", "6"],
          ["Rater agreement", "Krippendorff's alpha of at least 0.6 on garment attributes", "Pilot report", "2"],
          ["Image model quality", "Statistically significant human-preference win over the best open baseline on garment fidelity", "Paper 2", "9"],
          ["No regression", "No significant loss on standard metrics against the current production model", "Evaluation report", "9"],
          ["Image latency", "Distilled model at or below 13 seconds on an L40S", "Speed laboratory report", "11"],
          ["Video data", "At least 7,000 real clips and 20,000 verified synthetic pairs with provenance", "Data card", "11"],
          ["Video model quality", "Beats open video baselines on garment fidelity over time on the 300-clip hold-out", "Paper 3", "13"],
          ["Live speed", "At least 15 fps at 512p on one GPU, with the first frame in under 2 seconds", "Live evaluation report", "16"],
          ["Live cost", "Under USD 0.12 per stream-minute, a tenth of the rented engine", "Serving report", "16"],
          ["Live stability", "Prints and logos stable across 60-second sessions by text accuracy and garment similarity", "Live evaluation report", "16"],
          ["Publications", "Two image-track papers submitted by month 10, and two video-track papers by month 18", "Submission records", "18"],
          ["Open release", "Benchmark, video hold-out and evaluation toolkit public", "Repositories", "12 and 18"],
        ]}
      />

      <H2 id="open-science" n="6.6">
        Intellectual property and open science
      </H2>
      <p>
        Methods, benchmark results and the evaluation toolkit will be published openly, with every contributor credited as a
        co-author. The benchmark test set and the video hold-out will be released under a research licence with datasheets.
        The production model, the training corpus and the provenance ledger remain FabricVTON&apos;s property, because the
        underlying licences and consents cover training but not redistribution. Any release of research weights will be
        decided per licence and consent, and stated in Paper 2.
      </p>

      <H2 id="conclusion" n="6.8">
        Conclusion
      </H2>
      <Callout tone="dark" label="Conclusion">
        Virtual try-on is becoming a standard part of online fashion worldwide, and shoppers are starting to expect it live.
        The research behind it was built on a narrow wardrobe of stitched garments photographed in studios, it has never been
        audited for fairness, and the only live try-on engines are closed and cost about USD 1.20 a minute. FabricVTON already
        has the infrastructure, measurements, baseline and a working live shell. With funding for data, human evaluation and
        researchers, the programme will deliver within eighteen months the first global try-on benchmark with fairness
        strata, four papers, an open toolkit, commercially usable image and video try-on models, and live try-on on
        FabricVTON&apos;s own model.
      </Callout>
    </>
  );
}
