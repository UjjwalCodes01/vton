import { Callout, H2, Points, R, T } from "../_components/Doc";
import { RealtimeFigure } from "../_components/figures";

export const toc = [
  { id: "video", label: "Video virtual try-on" },
  { id: "realtime", label: "Real-time video generation" },
  { id: "live-products", label: "Live try-on products today" },
  { id: "video-licences", label: "Video models, data and licences" },
  { id: "gaps", label: "Gap analysis" },
  { id: "summary", label: "Summary of the current understanding" },
];

export const sources = [
  6, 15, 16, 20, 21, 22, 34, 43, 52, 53, 54, 55, 56, 57, 58, 59, 60, 70, 71, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97,
  98, 99, 100, 101, 102, 103,
];

export function Body() {
  return (
    <>
      <H2 id="video" n="2.9">
        Video virtual try-on
      </H2>
      <p>
        Video try-on has moved in three waves. In 2024, methods such as ViViD added motion layers to Stable Diffusion 1.5 and
        ran a second network over the garment <R n={78} />. In 2025, video diffusion transformers took over: CatV2TON
        concatenates garment and person in time, MagicTryOn fine-tunes the 14-billion-parameter Wan2.1 model, and DreamVVT
        tries the garment on a few keyframes first, then generates the video around them <R n={[79, 80, 81]} />. In 2026,
        almost every new paper fine-tunes a Wan2.1 or Wan2.2 variant, often with LoRA, and the field is moving to mask-free
        inputs, synthetic training pairs and keyframe-first pipelines <R n={[82, 83, 84, 85]} />.
      </p>
      <T
        n="Table 10"
        title="Selected video try-on methods"
        dense
        head={["Method", "Year and venue", "Base", "Key idea", "Speed reported", "Weights licence"]}
        rows={[
          [<>ViViD <R n={78} /></>, "2024", "SD 1.5 with motion layers", "Garment encoder with temporal attention; 9,700-pair dataset", "About 200 s per clip", "Code Apache-2.0; footage scraped"],
          [<>CatV2TON <R n={79} /></>, "CVPR 2025 workshop", "EasyAnimate DiT", "Garment and person concatenated in time; one model for image and video", "About 200 s per clip", "CC BY-NC-ND"],
          [<>MagicTryOn <R n={80} /></>, "2025", "Wan2.1, 14B", "Garment tokens with garment-aware position encoding; a Turbo version distilled to 4 steps", "6.7 s per 64 frames (Turbo)", "CC BY-NC-SA"],
          [<>DreamVVT <R n={81} /></>, "2025, ByteDance", "In-house MMDiT", "Try on keyframes first, then generate the video from pose and keyframes", "50 steps", "Not released"],
          [<>BooM-VVT <R n={84} /></>, "ACM MM 2026", "Qwen-Image-Edit-2511 keyframes with a Wan-Animate LoRA", "Mask-free; picks the keyframes where the garment matters most", "About 280 s per 65 frames", "CC BY-NC-SA"],
          [<>UniVVT <R n={85} /></>, "2026", "Wan2.1 with a vision-language model", "No mask, pose or warping at inference", "Conditioning in 2 to 3 s", "Not released"],
          [<>LiveVVT <R n={71} /></>, "2026", "Wan2.1 1.3B student, 14B teacher", "Rolling window with a persistent garment memory, 4 steps", "22.4 fps at 512×384", "No code released as of September 2026"],
          [<>Vidu S2-Editing <R n={86} /></>, "2026, closed", "In-house", "Bidirectional editor adapted to causal streaming", "25 to 42 fps at 720p on several GPUs", "Closed"],
        ]}
        note={<>Speeds were measured on different GPUs, resolutions and clip lengths and are not comparable. Reported VFID scores differ by about a hundredfold between papers, and one widely used VFID toolkit scores only the first 10 frames of each video <R n={84} />.</>}
      />
      <p>
        The papers name the same unsolved problems. Garment detail degrades in close-ups and at higher resolution, and no
        video try-on paper reports a metric for printed text or logos over time. Fast motion, occlusion and back views still
        break models. Long videos drift at window boundaries. Per-frame masks and pose maps cost about a second a frame to
        compute, which is more than a distilled generator needs, so live try-on has to be mask-free <R n={[85, 71]} />.
      </p>

      <H2 id="realtime" n="2.10">
        Real-time video generation
      </H2>
      <p>
        Standard image and video generators start from noise and clean it up over 20 to 50 passes, taking seconds for one
        image. Live try-on needs a new image every 33 to 66 milliseconds. The field got there with four published ideas, and
        every leading real-time system uses some mix of them:
      </p>
      <RealtimeFigure n="Figure 2.2" />
      <Points
        items={[
          { k: "Fewer passes, through distillation.", t: <>A slow, high-quality teacher trains a fast student to do the same job in 1 to 4 passes <R n={87} />.</> },
          {
            k: "Frame-by-frame generation with memory.",
            t: (
              <>
                Each frame is drawn from the live camera frame and the model&apos;s own recent frames, kept in a key-value
                cache, so the garment does not flicker or change design between frames <R n={88} />.
              </>
            ),
          },
          {
            k: "Training on its own mistakes.",
            t: (
              <>
                Small errors normally pile up frame after frame. Self-forcing and related methods train the model on its own
                imperfect outputs, so it learns to correct drift instead of amplifying it <R n={89} />.
              </>
            ),
          },
          {
            k: "Working small and engineering hard.",
            t: (
              <>
                Models draw a compressed image and then upscale it. They run on top GPUs with custom kernels, 8-bit or 4-bit
                arithmetic, sparse attention and a direct stream with no queue <R n={[90, 91]} />.
              </>
            ),
          },
        ]}
      />
      <T
        n="Table 11"
        title="Real-time video generation systems"
        dense
        head={["System", "Year and origin", "How it runs in real time", "Reported speed", "Weights"]}
        rows={[
          [<>CausVid <R n={87} /></>, "2025, research", "4-step causal student distilled from a slow bidirectional teacher", "About 17 fps on one H100 on Wan2.1 1.3B", "Non-commercial"],
          [<>Self-Forcing <R n={89} /></>, "2025, research", "Trained on its own rolled-out frames with a key-value cache, 4 steps", "17 fps at 832×480 on one H100", "Apache-2.0"],
          [<>LongLive 1.0 <R n={92} /></>, "2025, NVIDIA", "Permanent frame sink plus short-window attention, trained on 60-second rollouts", "20.7 fps at 832×480 on one H100", "Code Apache-2.0; weights non-commercial"],
          [<>Krea Realtime 14B <R n={93} /></>, "2025, Krea", "Self-forcing scaled to Wan2.1 14B, 4 steps", "11 fps on one B200", "Weights Apache-2.0; code non-commercial"],
          [<>StreamDiffusionV2 <R n={94} /></>, "MLSys 2026", "Training-free serving with a rolling key-value cache and sink tokens", "58 to 64 fps on 4 H100s", "Apache-2.0"],
          [<>JoyAI-Video-Edit <R n={95} /></>, "2026, JD", "16B live instruction editor in 2 steps; its demo includes clothing changes", "About 30 fps at 720×1248 on one B200", "Apache-2.0"],
          [<>MirageLSD and Lucy 2.5 <R n={[88, 90]} /></>, "2025 to 2026, Decart", "Frame-by-frame generation with history augmentation and custom kernels", "24 to 30 fps, under 40 ms per frame", "Closed"],
          [<>Seaweed APT2 <R n={91} /></>, "2025, ByteDance", "One network evaluation per latent frame after adversarial post-training", "736×416 at 24 fps on one H100", "Closed"],
          [<>LiveVVT <R n={71} /></>, "2026, research", "Try-on: rolling window with a persistent garment memory, 4 steps", "22.4 fps at 512×384", "No code released"],
        ]}
        note="Speeds are each team's own figures on different hardware. Several closed systems use more than one GPU per stream at 720p."
      />
      <p>
        The public recipe for a small team follows from these results: start from an open video diffusion transformer, train
        a garment-conditioned video editor, convert it into a causal student with self-forcing and step distillation, and keep
        a persistent memory of the garment. Before any custom kernel work, published systems of this kind reach about 11 to
        24 frames per second at around 480p on one high-end GPU <R n={[93, 96, 91]} />. Many popular real-time repositories
        cannot be used commercially: CausVid and the LongLive weights are non-commercial, and Krea&apos;s code is too, although
        its weights are Apache-2.0 <R n={[87, 92, 93]} />. The Self-Forcing code and the Wan2.1 models are Apache-2.0{" "}
        <R n={[89, 97]} />.
      </p>

      <H2 id="live-products" n="2.11">
        Live try-on products today
      </H2>
      <p>
        Decart is the clear leader in live try-on. Its Lucy VTON 3.5 model, released in August 2026, takes a live camera
        stream plus an optional garment photo and text prompt, and returns 720p video over WebRTC, the technology video calls
        use. Its SDK defines the model at 1280×720 and up to 30 frames per second. Sessions use short-lived client tokens,
        garments can be switched mid-session, and prompts and garment images are moderated on the server. The list price is
        USD 0.02 a second, or USD 1.20 a minute, and a faster mode costs double <R n={[72, 70, 98]} />. Decart discloses the
        principles, not the recipe: causal frame-by-frame generation, training on its own outputs, step distillation, custom
        GPU kernels and low-precision arithmetic <R n={[88, 90]} />.
      </p>
      <T
        n="Table 12"
        title="Commercial video and live try-on, September 2026"
        head={["Organisation", "Offering", "Live or offline", "Output and price", "Method disclosed"]}
        rows={[
          ["Decart", "Lucy VTON 3.5 API; Anywear store widget", "Live camera", "720p; USD 1.20 per minute", "Principles only"],
          ["Vidu (ShengShu)", "S2-Editing", "Live", "720p at 25 to 42 fps on several GPUs", <>Paper <R n={86} /></>],
          ["Google", "Doppl animated try-on, folded into Search", "Offline", "Short clips from a photo", "Not disclosed"],
          ["FASHN AI", "Image-to-Video API", "Offline", "5 to 10 s clips up to 1080p", "Not disclosed"],
          ["Luma AI", "Ray 3.2 video-to-video wardrobe change", "Offline", "Up to 20 s, up to 1080p", "Not disclosed"],
          ["Runway", "Aleph 2.0 video editing", "Offline", "Up to 30 s at 1080p", "Not disclosed"],
          ["Kling", "Try-on image, then image-to-video", "Offline", "Clips from a try-on image", "Not disclosed"],
        ]}
      />
      <p>
        For FabricVTON, Decart is both the benchmark to beat and a way to prove shopper demand while its own model is built.
        It will stay ahead on general live video. FabricVTON needs to win only on clothes: prints and logos that stay exact,
        fabric that looks like the real product, a much lower cost per minute, and a model it controls.
      </p>

      <H2 id="video-licences" n="2.12">
        Video base models, data and their licences
      </H2>
      <p>
        The licence rules for images apply to video. Almost every released video try-on checkpoint is non-commercial, but the
        Wan video models they build on are licensed Apache-2.0. A company can build on Wan, as long as it trains its own
        weights on its own data. Wan 2.5 and later have no open weights. Several other open video models carry traps: LTX-2
        charges above USD 10 million of revenue and bars competing products, and HunyuanVideo&apos;s licence does not apply in
        the EU, UK or South Korea <R n={[99, 100]} />.
      </p>
      <T
        n="Table 13"
        title="Open video models relevant to a commercial try-on model"
        dense
        head={["Model", "Released", "Size", "Relevant capability", "Licence", "Commercial use"]}
        rows={[
          [<>Wan2.1, with VACE and Fun-Control <R n={97} /></>, "2025", "1.3B and 14B", "Reference-to-video, masked video-to-video and pose control; the base of most try-on and real-time work", "Apache-2.0", "Yes"],
          [<>Wan2.2 and Wan2.2-Animate <R n={101} /></>, "2025 to 2026", "5B and 14B", "720p at 24 fps; pose-driven character replacement", "Apache-2.0", "Yes"],
          [<>JoyAI-Video-Edit <R n={95} /></>, "2026", "16B", "Live instruction editing of a camera feed", "Apache-2.0", "Yes"],
          [<>LTX-2 <R n={99} /></>, "2026", "19B to 22B", "Up to 4K; video-to-video and reference control", "LTX-2 Community License", "Free below USD 10M revenue; anti-competition clause"],
          [<>HunyuanVideo 1.5 <R n={100} /></>, "2025", "8.3B", "Image-to-video; try-on listed as an application", "Tencent Hunyuan Community", "Not in the EU, UK or South Korea"],
          ["CogVideoX 5B", "2024", "5B", "Image-to-video", "CogVideoX licence", "Capped at one million visits a month"],
          ["Released video try-on models", "2025 to 2026", "Various", "MagicTryOn, CatV2TON, BooM-VVT", "CC BY-NC-SA or CC BY-NC-ND", "No"],
        ]}
      />
      <T
        n="Table 14"
        title="Video try-on datasets and whether they permit commercial training"
        head={["Dataset", "Content", "Commercial training"]}
        rows={[
          [<>ViViD <R n={78} /></>, "9,700 garment-video pairs from Net-A-Porter footage", "No. Tagged Apache-2.0, but the footage is scraped retail content"],
          ["VVT and TikTok-derived sets", "Hundreds of catwalk and dance clips", "No. Research use or no licence"],
          [<>TripVVT-10K <R n={102} /></>, "10,031 synthetic triplets at 720×1280", "No. CC BY-NC 4.0"],
          [<>MV-Fashion <R n={103} /></>, "80 consented subjects, 754 garments, 68 cameras", "No. CC BY-NC-SA 4.0"],
          ["In-house sets", "DreamVVT 69,643 videos; Fashion-VDM 52,000 videos", "Not released"],
        ]}
      />
      <p>
        No public video try-on dataset is clearly cleared for commercial training. The approach the field has settled on is
        the synthetic-triplet idea applied to video: keep a real video as the target, create the input by re-dressing it
        synthetically, and pair it with the real garment photo <R n={[102, 85]} />. The model then only ever learns to
        reproduce real footage.
      </p>

      <H2 id="gaps" n="2.13">
        Gap analysis
      </H2>
      <T
        n="Table 15"
        title="Research gaps in virtual try-on, September 2026"
        dense
        head={["Research area", "Status", "Closest prior work", "Implication for this programme"]}
        rows={[
          ["Garments beyond the stitched Western wardrobe: draped, wrapped and regional dress", <span key="tag" className="dx-tag dx-tag--open">Open</span>, "BD-VITON (1,013 pairs, older models); DIVA", "Core of Papers 1 and 2"],
          ["Fairness by skin tone and body shape", <span key="tag" className="dx-tag dx-tag--open">Open</span>, "No audit found; slim-body bias noted by SiCo", "Built into Paper 1"],
          ["Garment-faithful live try-on", <span key="tag" className="dx-tag dx-tag--open">Open</span>, "LiveVVT (512×384, needs masks, no code); closed engines", "Core of WP7 and Paper 4"],
          ["Print and logo stability over time in video", <span key="tag" className="dx-tag dx-tag--open">Open</span>, "No video try-on paper reports a text or logo metric", "Evaluation axis and Paper 3"],
          ["Commercially clean video try-on data", <span key="tag" className="dx-tag dx-tag--open">Open</span>, "All public sets are non-commercial or scraped", "WP6 data engine"],
          ["Mask-free video try-on", <span key="tag" className="dx-tag dx-tag--partial">Partly addressed</span>, "UniVVT, BooM-VVT", "Required for live use"],
          ["Try-off and pseudo-pairs beyond stitched garments", <span key="tag" className="dx-tag dx-tag--partial">Partly addressed</span>, <>TryOffDiff <R n={57} />, Voost, for stitched garments</>, "Method component of Paper 2"],
          ["Real shoppers' photos", <span key="tag" className="dx-tag dx-tag--partial">Partly addressed</span>, "StreetTryOn; in-the-wild methods such as BooW-VTON", "Photo condition as a benchmark axis"],
          ["Size- and fit-aware try-on", <span key="tag" className="dx-tag dx-tag--crowded">Crowded</span>, <>FIT <R n={58} />, FitControler <R n={59} /></>, "Evaluation axis only"],
          ["Fast, few-step image try-on", <span key="tag" className="dx-tag dx-tag--crowded">Crowded</span>, "DirectTryOn, FastFit", "Engineering work; optional cost report"],
          ["Layering and multiple garments", <span key="tag" className="dx-tag dx-tag--crowded">Crowded</span>, "Layering VTON, Garments2Look, OmniTry", "Outerwear and multi-piece outfits as benchmark axes"],
          ["Mask-free image try-on and body preservation", <span key="tag" className="dx-tag dx-tag--crowded">Crowded</span>, <>BooW-VTON <R n={60} />, FASHN VTON 1.5</>, "Personal and cultural details as a benchmark axis"],
          ["General benchmarks and judges", <span key="tag" className="dx-tag dx-tag--crowded">Crowded</span>, "OpenVTON-Bench, VTON-QBench, TryOnReward", "Calibrate existing judges rather than build new ones"],
        ]}
      />

      <H2 id="summary" n="2.14">
        Summary of the current understanding
      </H2>
      <Callout label="In short" tone="accent">
        <ul>
          <li>The frontier has moved to fine-tuned image-editing models and reinforcement learning on human preference.</li>
          <li>Data, not architecture, separates industrial systems from academic ones.</li>
          <li>Commercially usable bases exist, notably Qwen-Image-Edit-2511 and FLUX.2 klein base 4B.</li>
          <li>The standard datasets and most open try-on checkpoints are non-commercial.</li>
          <li>Garments beyond the stitched Western wardrobe, real shoppers&apos; photos, and fairness across skin tones and body shapes remain open research problems.</li>
          <li>Video try-on has converged on Apache-2.0 Wan video models, but released video try-on weights and datasets are non-commercial.</li>
          <li>Live try-on works today only on closed engines at about USD 1.20 a minute. One open research method shows it is reachable on one GPU, at modest resolution.</li>
        </ul>
      </Callout>
    </>
  );
}
