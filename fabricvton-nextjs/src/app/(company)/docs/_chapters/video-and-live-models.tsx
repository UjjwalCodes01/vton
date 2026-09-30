import { H2, Points, R, T } from "../_components/Doc";
import { LoopFigure } from "../_components/figures";

export const toc = [
  { id: "wp6", label: "WP6 Video try-on model" },
  { id: "video-data", label: "Video data engine" },
  { id: "video-recipe", label: "Video training recipe" },
  { id: "wp7", label: "WP7 Live try-on" },
  { id: "streaming", label: "Streaming system" },
  { id: "evaluation", label: "Evaluation protocol" },
  { id: "hypotheses", label: "Research questions" },
  { id: "compute", label: "Compute estimate" },
];

export const sources = [7, 71, 80, 81, 84, 85, 86, 87, 89, 95, 97, 98, 101, 102, 104, 105, 106, 107, 108, 109, 110];

export function Body() {
  return (
    <>
      <H2 id="wp6" n="3.8">
        WP6: Video try-on model
      </H2>
      <h3>Base model and design</h3>
      <p>
        The offline video model fine-tunes Wan2.1 14B, which is licensed Apache-2.0 and is the base behind most 2026 video
        try-on papers <R n={[97, 80, 71]} />. It also serves as the teacher for the live student in WP7. The design follows the
        pattern the field has converged on:
      </p>
      <Points
        items={[
          {
            k: "Garment memory.",
            t: (
              <>
                The garment views from WP3 are encoded once and prepended as reference tokens, with a garment-aware position
                encoding, so the same garment is looked up in every frame <R n={80} />.
              </>
            ),
          },
          {
            k: "No per-frame masks.",
            t: (
              <>
                The model reads the person video directly instead of body masks and pose maps, because those cost more per
                frame than a distilled generator <R n={[85, 84]} />.
              </>
            ),
          },
          {
            k: "Keyframes from the image model.",
            t: (
              <>
                For training data and for hard garments, FabricVTON&apos;s WP3 image model dresses a few keyframes, and the
                video model generates the motion around them <R n={[81, 84]} />.
              </>
            ),
          },
        ]}
      />

      <h3 id="video-data">Video data engine</h3>
      <p>
        No public video dataset can be used commercially, so the data is built from scratch. Real, consented footage is
        always the target; synthetic re-dressing only ever creates the input <R n={[102, 85]} />.
      </p>
      <T
        n="Table 21"
        title="Video training data sources and licence position"
        head={["Source", "What it provides", "Licence position", "Role"]}
        rows={[
          ["Consented video shoots", "Each look filmed on three synchronised cameras, a phone and a webcam, with the garment's product shots", "Owned, with releases covering AI training and synthetic derivatives", "Real targets with real garment photos"],
          ["Licensed motion footage", "People moving in varied settings, without paired garment photos", <>Dataset licences <R n={104} /> or brokered creator footage; free stock sites generally forbid machine-learning use without permission <R n={105} /></>, "Motion variety for the unpaired stage"],
          ["Synthetic re-dressed inputs", "Keyframes re-dressed by an Apache-2.0 image teacher, propagated with Wan2.2-Animate", <>All teachers are Apache-2.0 <R n={101} /></>, "Paired training at scale"],
          ["Public research sets", "ViViD, VVT, TripVVT-10K", "Non-commercial or scraped", "Evaluation only, never training"],
        ]}
      />
      <p>
        Each candidate clip must pass a temporal warping check with RAFT optical flow, frame-to-frame and garment similarity
        checks, identity and background checks, a vision-language judge, and a human spot check <R n={106} />. The annotation
        tools are chosen for their licences: SAM 2 for segmentation, RTMPose for pose, RAFT for flow and Qwen2.5-VL-7B for
        captions <R n={[107, 108]} />. OpenPose, Sapiens, CoTracker, SMPL-X and InsightFace are excluded, because their
        licences forbid commercial use.
      </p>
      <T
        n="Table 22"
        title="Video shoot plan"
        head={["Tier", "People and looks", "Garments", "Shoot days", "Clips produced"]}
        rows={[
          ["Pilot", "6 adults", "60", "2", "Protocol and pipeline tested end to end"],
          ["Tier A, programme target", "40 adults, 20 looks each", "300", "About 18", "About 7,000 real clips and 20,000 synthetic pairs, plus 150 hours of licensed footage"],
          ["Tier B, if funded", "100 adults, 25 looks each", "800", "About 55", "About 22,000 real clips and 60,000 synthetic pairs, plus 500 hours of licensed footage"],
        ]}
        note="Each look follows a fixed motion script of about 100 seconds: standing, a slow turn, walking, arm raises, garment adjustments, sitting and a fast spin. Only consenting adults are filmed, with ID checks. Scale is anchored on published sets of about 9,000 to 10,000 videos."
      />

      <h3 id="video-recipe">Training recipe</h3>
      <T
        n="Table 23"
        title="Initial video training configuration"
        head={["Setting", "Value", "Basis"]}
        rows={[
          ["Base", "Wan2.1 14B, Apache-2.0", "Used by MagicTryOn, KeyTailor and LiveVVT's teacher"],
          ["Adapter", "LoRA first, full fine-tune of attention layers if needed", "KeyTailor, Eevee"],
          ["Inputs", "Person video, garment tokens from several views, optional keyframes", "MagicTryOn, DreamVVT, BooM-VVT"],
          ["Clips", "81 frames, 480p first, then 720p", "Common 2026 setting"],
          ["Stages", "Synthetic pairs, then real consented pairs, then a high-resolution detail stage", "Mirrors the image recipe"],
          ["Hardware", "8 H100 GPUs for about two weeks per full run", "MagicTryOn and DreamVVT used 8 H20 GPUs"],
        ]}
      />

      <H2 id="wp7" n="3.9">
        WP7: Live try-on
      </H2>
      <h3>From offline model to live model</h3>
      <p>
        The live model is a 1.3-billion-parameter Wan2.1 student, in its VACE or Fun-Control variant, that learns from the 14B
        offline model, following the path LiveVVT and Vidu S2 describe <R n={[71, 86]} />. Before any training, the team tests
        JD&apos;s Apache-2.0 JoyAI-Video-Edit zero-shot on garment changes and benchmarks the leading commercial engine as the
        quality bar <R n={95} />. The student is then built in four steps:
      </p>
      <Points
        items={[
          { k: "Causal conversion.", t: <>The student learns to generate frame by frame from the teacher&apos;s outputs, so it never needs future frames <R n={87} />.</> },
          {
            k: "Self-forcing and step distillation.",
            t: (
              <>
                It is trained on its own rolled-out frames with a key-value cache, using the Apache-2.0 Self-Forcing code, then
                distilled to 1 to 4 steps, so errors do not accumulate and each frame is fast <R n={89} />.
              </>
            ),
          },
          {
            k: "Persistent garment memory.",
            t: (
              <>
                The garment photo and description are encoded once per session and kept alongside a frontal keyframe, which
                keeps a print the same print as the shopper turns <R n={71} />.
              </>
            ),
          },
          { k: "Speed engineering.", t: "8-bit arithmetic, compiled kernels and an upscaler from 512p to 720p come after quality is proven." },
        ]}
      />

      <h3 id="streaming">Streaming system</h3>
      <p>
        Figure 2 shows one frame of the loop. The browser sends the camera over WebRTC to a GPU in the nearest region; the
        model draws the new frame; it streams back to the screen; and the next frame follows about 33 milliseconds later.
        FabricVTON&apos;s existing live page already handles the camera, the consent screen, the session limit and one-time
        session tokens. Only two small parts of it talk to the rented engine, so FabricVTON&apos;s own model can replace it
        behind the same page. The streaming servers use the open-source LiveKit WebRTC server, and each stream needs about 1.3
        to 2.4 megabits per second in each direction <R n={[109, 98]} />. People notice a delay in a mirror-like view at about
        150 milliseconds, which open models cannot reach yet, so the design target is about 0.4 seconds from camera to screen.
        Live serving uses GPUs with hardware video encoders, such as the L40S or RTX PRO 6000, because the H100 and B200 have
        none.
      </p>
      <LoopFigure n="Figure 2" />
      <T
        n="Table 24"
        title="Live try-on targets against the rented engine"
        head={["Measure", "Rented engine today", "FabricVTON target", "Basis"]}
        rows={[
          ["Resolution", "720p", "512p first, 720p through an upscaler", "LiveVVT 512×384; rented engine 720p"],
          ["Frame rate", "Up to 30 fps", "15 to 20 fps first, then 24", "Published one-GPU systems reach 11 to 24 fps"],
          ["First frame", "About 1.5 s, vendor claim", "Under 2 s", "LiveVVT 1.56 s"],
          ["Cost per minute", "USD 1.20", "About USD 0.07", "One H100 per stream at list price"],
          ["Garment fidelity", "Not published", "Measured on the video hold-out, including prints over 60 s", "WP1 video hold-out"],
          ["Control", "Closed model and terms", "Own model, own data, own serving", "Programme goal"],
        ]}
      />

      <H2 id="evaluation" n="3.10">
        Evaluation protocol
      </H2>
      <T
        n="Table 25"
        title="Evaluation measures"
        head={["Measure", "What it captures", "Use"]}
        rows={[
          ["FID and KID", "Distribution-level realism", "Comparability with prior work"],
          ["SSIM and LPIPS", "Pixel and perceptual similarity in the paired setting", "Comparability and regression tracking"],
          ["Garment similarity on crops", "Structural garment fidelity using self-supervised image features", "Automatic fidelity proxy"],
          ["Text and motif accuracy", "Character error rate of printed text and logos, and motif matching", "Fine-detail fidelity"],
          ["Garment attribute accuracy", "Human labels for fit, length, layer order, closures, print and drape", "Primary outcome"],
          ["Skin-tone drift", "Colour difference (CIEDE2000) on exposed skin before and after try-on", "Fairness"],
          ["Body-shape distortion", "Change in keypoints and silhouette", "Fairness"],
          ["Pairwise human preference", "Overall quality as judged by raters from several regions", "Primary outcome"],
          ["Judge agreement", "Kendall τ between automatic judges and human raters, per garment family", "Tests hypothesis H3"],
          ["Video realism", "VFID on full-length clips, with the corrected toolkit", "Comparability for video"],
          [<>Temporal stability</>, <>Optical-flow warping error and VBench consistency scores <R n={110} /></>, "Flicker and drift"],
          ["Garment fidelity over time", "Garment similarity and text accuracy on frames sampled across each clip", "Primary video outcome"],
          ["Live performance", "Time to first frame, sustained frame rate, 95th-percentile frame latency, drift per 10 seconds", "Live readiness"],
          ["Latency and cost", "Seconds per photo and USD per image or per stream-minute", "Product readiness"],
        ]}
      />
      <p>
        The primary outcomes, human-rated garment fidelity and pairwise preference, are fixed before experiments begin.
        Results carry bootstrap confidence intervals and are broken out by garment family, presentation, photo or video
        condition, skin-tone group and body shape.
      </p>

      <H2 id="hypotheses" n="3.11">
        Research questions and hypotheses
      </H2>
      <T
        n="Table 26"
        title="Research questions and hypotheses"
        head={["ID", "Research question", "Hypothesis", "Tested in"]}
        rows={[
          ["H1", "How do current systems fail on garments beyond stitched studio wear?", "Failures are specific and measurable, concentrated in layer order, multi-piece consistency, fine print, back views and drape", "Paper 1"],
          ["H2", "Are the failures uneven across skin tones and body shapes?", "Skin-tone drift and body distortion are larger for darker skin tones and larger bodies", "Paper 1"],
          ["H3", "Do standard metrics and automatic judges detect these failures?", "Metrics and judges calibrated on stitched studio garments agree less with human raters on the harder garment families and on real shoppers' photos", "Paper 1"],
          ["H4", "Can multi-view conditioning and pseudo-pair adaptation close the gap?", "Multi-view garments plus fine-tuning on pseudo-pairs close most of the gap with a few thousand real pairs", "Paper 2"],
          ["H5", "Can an image try-on model teach a video model?", "Video pairs made by re-dressing real clips with the image model, keeping the real clip as the target, train a video model that beats open video baselines without scraped data", "Paper 3"],
          ["H6", "Can garment fidelity survive the move to live generation?", "A causal student with a persistent garment memory and self-forcing training keeps prints and logos stable for 60 seconds or more at 15 fps or better", "Paper 4"],
        ]}
      />

      <H2 id="compute" n="3.12">
        Compute estimate
      </H2>
      <T
        n="Table 27"
        title="Estimated compute budget"
        head={["Item", "Basis", "Estimate (USD)"]}
        rows={[
          ["Baseline audit", "About 3,000 pairs across ten systems, open models on cloud GPUs plus paid APIs at USD 0.04 to 0.075 per image", "1,000 to 2,000"],
          ["Synthetic image triplets", "500,000 teacher outputs at 6.5 seconds each on an L40S at USD 2.27 per hour", "About 2,000"],
          ["Image LoRA runs and ablations", "Layering VTON scale, 300 to 600 H200 GPU-hours per full run, plus five to eight smaller runs", "6,500 to 13,000"],
          ["Image distillation and serving tests", "Student training plus speed-laboratory runs", "1,000 to 3,000"],
          ["Video annotation and filtering", "About 300 to 800 GPU-hours for segmentation, pose, flow and captions", "1,000 to 3,000"],
          ["Synthetic video pairs", "About 2,000 to 3,000 GPU-hours, including over-generation before filtering", "6,000 to 12,000"],
          ["Offline video model", "Three two-week runs on 8 H100s (about 2,700 GPU-hours each at USD 3.95) plus ablations", "30,000 to 45,000"],
          ["Live distillation", "1,500 to 5,000 H100-hours across several attempts; published recipes used about 100 to 3,000", "7,000 to 20,000"],
          ["Streaming tests and live pilot", "Serving GPUs, TURN relays and load tests", "3,000 to 6,000"],
          [<strong key="t">Total compute</strong>, "Photography, video shoots, raters and annotation are budgeted separately", <strong key="v">60,000 to 105,000</strong>],
        ]}
        note="These are planning estimates. The L40S rate and 6.5-second time come from FabricVTON's measurements; H100 and H200 rates are cloud list prices; training hours are extrapolated from published recipes. Cloud credits would reduce the cash cost."
      />
    </>
  );
}
