import { H2, R, T } from "../_components/Doc";
import { GanttFigure } from "../_components/figures";

export const toc = [
  { id: "phases", label: "Phases" },
  { id: "schedule", label: "Schedule and milestones" },
  { id: "publications", label: "Publication calendar" },
  { id: "governance", label: "Governance" },
  { id: "risks", label: "Risk register" },
];

export const sources = [63, 64];

const L = ({ v }: { v: "Low" | "Medium" | "High" }) => <span className={`dx-tag dx-tag--${v.toLowerCase()}`}>{v}</span>;

export function Body() {
  return (
    <>
      <p className="dx-lede">
        The programme runs for eighteen months in seven phases. The image track fills most of the first year; the video track
        starts in month 4 with its capture protocol and becomes the main effort from month 9. Month 1 is indicatively October
        2026. If funding starts later, the months shift and the venue plan moves to the next cycle of each venue.
      </p>

      <H2 id="phases" n="4.1">
        Phases
      </H2>
      <T
        n="Table 28"
        title="Programme phases, deliverables and exit criteria"
        head={["Phase", "Months", "Key activities", "Deliverables", "Exit criterion"]}
        rows={[
          ["P0 Foundations", "1", "Company registration and DPIIT recognition; evaluation harness; consent, annotation and data protocols; licence register; cloud credit applications", "Harness running on at least six systems; approved protocols", "Harness reproduces published numbers within tolerance on a public split"],
          ["P1 Pilot", "2", "Pilot shoot of 20 garments across the garment families; annotation guide; pilot audit", "Pilot set; inter-rater agreement report", "Krippendorff's alpha of at least 0.6 on garment attributes"],
          ["P2 Benchmark", "3 to 6", "Main collection and annotation; audit of at least ten systems; human study; Paper 1", "Benchmark v1 frozen; Paper 1 on arXiv and submitted", "Benchmark meets its size, garment-family and strata targets"],
          ["P3 Image model", "3 to 9", "Data engine; synthetic triplets; LoRA stages; multi-view conditioning; ablations; preference tuning", "Image model; ablation report", "First LoRA beats the current production model on pilot garment fidelity"],
          ["P4 Distil and transfer", "9 to 12", "Distillation; serving tests; serving-pipeline clean-up; Paper 2; image-track releases", "Distilled image model; Paper 2 submitted; toolkit and benchmark released", "Distilled model within twice 6.5 seconds on an L40S with no significant loss in preference"],
          ["P5 Video model", "4 to 14", "Video capture protocol and pilot shoot; main shoots; video data engine; offline video model; Paper 3", "Video training set v1; offline video model; Paper 3 submitted", "Offline model beats open video baselines on garment fidelity over time on the hold-out"],
          ["P6 Live", "12 to 18", "Causal conversion and distillation; streaming servers; live pilot behind the existing live page; Paper 4", "Live model; pilot report; Paper 4 submitted", "At least 15 fps at 512p on one GPU, first frame under 2 s, cost under a tenth of the rented engine"],
        ]}
      />

      <H2 id="schedule" n="4.2">
        Schedule and milestones
      </H2>
      <GanttFigure n="Figure 3" />
      <T
        n="Table 29"
        title="Milestones"
        head={["ID", "Milestone", "Month", "Evidence"]}
        rows={[
          ["MS1", "Evaluation harness running on at least six systems", "1", "Harness report"],
          ["MS2", "Pilot set and inter-rater agreement report", "2", "Pilot report"],
          ["MS3", "Benchmark v1 frozen", "5", "Datasheet and data card"],
          ["MS4", "Paper 1 posted to arXiv and submitted", "6", "Submission record"],
          ["MS5", "Video pilot: capture protocol tested and first 200 consented clips", "6", "Pilot report"],
          ["MS6", "First LoRA beats the current production model on pilot garment fidelity", "7", "Evaluation report"],
          ["MS7", "Image ablations complete", "8", "Ablation report"],
          ["MS8", "Paper 2 submitted", "10", "Submission record"],
          ["MS9", "Distilled image model meets the latency target", "11", "Speed laboratory report"],
          ["MS10", "Video training set v1: 7,000 real clips and 20,000 verified synthetic pairs", "11", "Data card and provenance ledger"],
          ["MS11", "Image-track releases and interim report", "12", "Repositories and interim report"],
          ["MS12", "Offline video model beats open video baselines on the hold-out", "13", "Evaluation report"],
          ["MS13", "Paper 3 submitted", "14", "Submission record"],
          ["MS14", "Live prototype: at least 15 fps at 512p on one GPU, first frame under 2 s", "16", "Live evaluation report"],
          ["MS15", "Live pilot with shoppers, Paper 4 submitted and final report", "18", "Pilot report, submission record and final report"],
        ]}
      />

      <H2 id="publications" n="4.3">
        Publication calendar
      </H2>
      <T
        n="Table 30"
        title="Target venues and indicative deadlines"
        head={["Venue", "Indicative deadline", "Status on 30 September 2026", "Target"]}
        rows={[
          [<>CVPR 2027, main conference <R n={63} /></>, "16 November 2026", "Confirmed", "Too early for any paper"],
          ["CVPR 2027 workshops", "Around March 2027", "Not yet announced", "Paper 1"],
          ["ACM Multimedia 2027", "Around late March to April 2027", "Not yet announced", "Paper 1 or Paper 2"],
          [<>NeurIPS 2027 Evaluations and Datasets <R n={64} /></>, "Around May 2027", "Not yet announced", "Paper 1, extended"],
          ["BMVC 2027", "Around late May 2027", "Not yet announced", "Paper 2 if results are early"],
          ["WACV 2028", "Around June and August 2027", "Not yet announced", "Paper 2 or the cost report"],
          ["CVPR 2028", "Around mid-November 2027", "Not yet announced", "Paper 3"],
          ["SIGGRAPH 2028", "Around January 2028", "Not yet announced", "Paper 4 if results are early"],
          ["ECCV 2028", "Around March 2028", "Not yet announced", "Paper 4"],
        ]}
        note="Deadlines marked 'around' follow each venue's usual cycle and will be confirmed when calls open. These venues allow arXiv preprints if the submitted paper is anonymous."
      />

      <H2 id="governance" n="4.4">
        Governance and ways of working
      </H2>
      <ul>
        <li>A weekly research meeting with a shared agenda, and a monthly steering review with the founders.</li>
        <li>One code repository, one experiment tracker and versioned configurations, so every reported number can be reproduced.</li>
        <li>A named data steward who owns the provenance ledger, consent records and release decisions.</li>
        <li>An authorship and contribution policy agreed in writing before work starts.</li>
        <li>Quarterly progress reports to funders against the milestones and the key performance indicators.</li>
      </ul>

      <H2 id="risks" n="4.5">
        Risk register
      </H2>
      <T
        n="Table 31"
        title="Risks and mitigations"
        head={["Risk", "Likelihood", "Impact", "Mitigation"]}
        rows={[
          ["A licence contaminates the model", <L key="l" v="Medium" />, <L key="i" v="High" />, "Apache-2.0 or MIT bases, teachers and annotation tools only; licence register and provenance ledger; legal review before any release"],
          ["Consent or privacy failure", <L key="l" v="Low" />, <L key="i" v="High" />, "Written consent and releases covering AI training and synthetic derivatives; no scraping; anonymised public release"],
          ["Another group publishes first", <L key="l" v="Medium" />, <L key="i" v="Medium" />, "Post to arXiv early; keep the focus on garment coverage, fairness strata and garment-faithful live try-on"],
          ["Data collection is slower than planned", <L key="l" v="Medium" />, <L key="i" v="Medium" />, "Pilot first; catalogue partners in parallel; a 1,000-pair minimum image benchmark as fallback"],
          ["Diverse subjects and garments are hard to source from one country", <L key="l" v="Medium" />, <L key="i" v="Medium" />, "Catalogue, stock and footage partners in several regions; partner shoots abroad; coverage reported honestly for every stratum"],
          ["Video data is costly and slow", <L key="l" v="High" />, <L key="i" v="Medium" />, "Pilot shoot before Tier A, Tier A before Tier B; shooting in India lowers cost; licensed footage covers the unpaired stage"],
          ["Live garment accuracy falls short", <L key="l" v="Medium" />, <L key="i" v="High" />, "Ship offline video first; keep the rented engine for pilots; report the gap against the hold-out honestly"],
          ["Serving cost of large models", <L key="l" v="High" />, <L key="i" v="Medium" />, "Distil the image model into a 4B student and the video model into a 1.3B live student; keep the current production model until the student wins"],
          ["GPU capacity for training and live serving", <L key="l" v="Medium" />, <L key="i" v="Medium" />, "Cloud credits across providers; the portable worker container already built; one GPU per live stream by design"],
          ["Live video is misused to fake someone's appearance", <L key="l" v="Medium" />, <L key="i" v="High" />, "The guardrail plan: age and consent checks at session start, sampled output moderation, session limits and labels"],
          ["Volunteer attrition", <L key="l" v="Medium" />, <L key="i" v="Medium" />, "Funded fellowships, scoped tasks and clear authorship"],
        ]}
      />
    </>
  );
}
