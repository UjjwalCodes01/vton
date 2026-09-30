import { H2, Points, R, T } from "../_components/Doc";
import { EraFigure } from "../_components/figures";

export const toc = [
  { id: "task", label: "The task" },
  { id: "architectures", label: "How the architectures evolved" },
  { id: "results", label: "Reported results" },
  { id: "strongest", label: "What the strongest systems do" },
  { id: "industry", label: "Industrial landscape" },
  { id: "foundations", label: "Open foundation models" },
  { id: "datasets", label: "Datasets and their licences" },
  { id: "evaluation", label: "How try-on is evaluated" },
];

export const sources = [
  3, 4, 5, 6, 14, 15, 16, 17, 18, 19, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
];

export function Body() {
  return (
    <>
      <p className="dx-lede">
        This part of the docs summarises the state of image virtual try-on as of September 2026. It draws on published
        papers, model cards, licence files and company disclosures. Where a figure could not be verified from a primary
        source, the text says so.
      </p>

      <H2 id="task" n="2.1">
        The task
      </H2>
      <p>
        An image try-on model takes a photograph of a person and a photograph of a garment, and produces a photograph of that
        person wearing that garment. The garment photo may be a product shot or a photo of someone else wearing it. Two
        evaluation settings are standard. In the <strong>paired</strong> setting, the model re-dresses a person in the garment
        they already wear, so the output can be compared with the real photograph. In the <strong>unpaired</strong> setting
        the garment is new, so only distribution-level realism can be scored.
      </p>
      <p>
        Models also differ in what else they need. Older methods require a mask of the region to repaint, a pose map and a
        body-part segmentation. Newer mask-free methods take only the two photographs, which makes them easier to deploy and
        less brittle when segmentation fails.
      </p>
      <p>
        <strong>Video and live try-on.</strong> Video try-on takes a video of a person and a garment image, and returns the
        video with the person wearing the garment. It must keep identity, motion and background, and keep the garment
        identical from frame to frame. Live try-on does the same on a camera stream as it arrives. Each frame must be ready in
        about 33 to 66 milliseconds, drawn only from the current camera frame and what the model has already produced,
        because future frames do not exist yet.
      </p>

      <H2 id="architectures" n="2.2">
        How the architectures evolved
      </H2>
      <EraFigure n="Figure 2.1" />
      <T
        n="Table 5"
        title="Generations of virtual try-on architecture"
        head={["Period", "Approach", "Representative work", "Main limitation"]}
        rows={[
          ["2023", "Warp the garment, then paint", <>TryOnDiffusion <R n={31} />, LaDI-VTON <R n={32} /></>, "Explicit warping fails on large deformation. TryOnDiffusion needed about 4 million private pairs."],
          ["2024", "Garment reference network sharing attention", <>StableVITON <R n={33} />, OOTDiffusion, IDM-VTON, Leffa</>, "Needs masks, pose and parsing. Built on older latent backbones that blur fine detail."],
          ["Late 2024", "One network, images side by side", "CatVTON, TPD", "Lightweight, but limited by the older backbone."],
          ["2025", "Diffusion transformer with garment tokens in context", <>FitDiT, OmniTry <R n={34} />, Voost <R n={35} />, FASHN VTON 1.5</>, "Mask-free training relies on synthetic pairs made by an earlier model."],
          ["2026", "LoRA fine-tuning of general image-editing models", <>Layering VTON, TAMF-VTON <R n={36} /> on Qwen-Image-Edit; RealFit <R n={37} /> on FLUX Kontext</>, "Base-model licences vary. Large models are slow and costly to serve."],
          ["2026", "Fashion foundation models with reinforcement learning", "Tstars-Tryon (5B), Oxygen-TryOn (16B)", "Require tens of millions of images and in-house reward models."],
        ]}
      />
      <p>
        OOTDiffusion, often cited as the reference open model, belongs to the 2024 generation. It pairs a Stable Diffusion 1.5
        denoiser with an outfitting network whose features are fused through self-attention, and it reports results at
        512×384 <R n={25} />. Its fusion idea survives in newer designs. Its backbone, resolution and CC BY-NC-SA 4.0 licence
        make it unsuitable as the foundation for a commercial model today.
      </p>

      <H2 id="results" n="2.3">
        Reported results on the standard benchmark
      </H2>
      <p>
        Table 6 lists results on VITON-HD as reported in each paper. The numbers are indicative only. Papers differ in
        resolution, FID implementation and whether baselines were re-run, so differences below about one FID point are within
        that noise.
      </p>
      <T
        n="Table 6"
        title="Reported VITON-HD results for selected methods"
        dense
        head={["Method", "Year", "Base", "FID (unpaired) ↓", "SSIM ↑", "LPIPS ↓", "Weights licence"]}
        rows={[
          ["LaDI-VTON", "2023", "SD 2", "9.41", "0.876", "0.091", "CC BY-NC"],
          ["OOTDiffusion", "2024", "SD 1.5", "8.81 *", "0.878", "0.071", "CC BY-NC-SA"],
          ["IDM-VTON", "2024", "SDXL", "6.29 †", "0.870", "0.102", "CC BY-NC-SA"],
          ["CatVTON", "2025", "SD 1.5", "9.02", "0.870", "0.057", "CC BY-NC-SA"],
          ["Leffa", "2025", "SD 1.5", "8.52", "0.899", "0.048", "MIT code, non-commercial data"],
          ["FitDiT", "2024", "SD 3", "8.20", "0.899", "0.066", "CC BY-NC-SA"],
          ["Voost", "2025", "DiT", "8.98", "0.898", "0.056", "Not released"],
          [<>FastFit <R n={38} /></>, "2025", "SD 1.5", "8.63", "0.885", "0.078", "Non-commercial"],
          [<>CORAL <R n={39} /></>, "2026", "FLUX Fill", "8.76", "0.907", "0.048", "Non-commercial base"],
          ["RealFit", "2026", "FLUX Kontext", "7.74", "0.907", "0.049", "Non-commercial base"],
          ["TAMF-VTON", "2026", "Qwen-Image-Edit", "6.27", "0.913", "0.052", "No code released"],
          ["Oxygen-TryOn", "2026", "JoyAI-Image-Edit, 16B", "9.15 ‡", "0.914", "0.050", "Weights announced"],
          [<>FASHN VTON 1.5 <R n={40} /></>, "2026", "Own 972M, pixel space", "Not published", "Not published", "Not published", "Apache-2.0"],
        ]}
        note="* Reported at 512×384. † Evaluation setting not stated; CatVTON's re-run of IDM-VTON gives 9.84. ‡ Oxygen-TryOn re-evaluated all baselines itself and reports the best paired FID, 3.94. SSIM and LPIPS are paired-setting values."
      />
      <p>
        Two conclusions follow. First, VITON-HD is saturating: the spread among modern methods is small relative to
        measurement noise, and the benchmark itself covers only upper-body garments. Second, general image editors are now
        serious competitors. On VTEdit-Bench, published at ECCV 2026, FLUX.2 models ranked best overall among general editors
        and Qwen-Image-Edit-2511 came close <R n={41} />. In Alibaba&apos;s human study, Tstars-Tryon beat Google&apos;s Nano Banana
        Pro in 41.1% of comparisons, tied in 41.6% and lost 17.3% <R n={3} />.
      </p>

      <H2 id="strongest" n="2.4">
        What distinguishes the strongest systems
      </H2>
      <Points
        items={[
          {
            k: "Scale and synthetic pairs.",
            t: (
              <>
                Google trained TryOnDiffusion on about 4 million pairs. FASHN trained VTON 1.5 on 18 million masked pairs and
                then 4 million synthetic triplets, and JD built Oxygen-TryOn from more than 50 million raw images{" "}
                <R n={[31, 40, 15]} />. A synthetic triplet keeps a real photograph as the target and uses an earlier model to
                create the input. The model therefore learns to produce real photographs without needing a mask.
              </>
            ),
          },
          {
            k: "Editing foundation models plus LoRA.",
            t: (
              <>
                Layering VTON fine-tuned Qwen-Image-Edit with LoRA of rank 32 on the attention projections, on one NVIDIA H200
                GPU: 20,000 steps on 29,151 pairs, then 5,000 steps on 5,768 pairs <R n={16} />. TAMF-VTON reports the lowest
                unpaired FID in Table 6 with a mixture-of-experts LoRA on the same base <R n={36} />.
              </>
            ),
          },
          {
            k: "Preference optimisation.",
            t: (
              <>
                Tstars-Tryon and Oxygen-TryOn follow pre-training and supervised fine-tuning with reinforcement learning.
                Oxygen&apos;s reward combines an 8-billion-parameter vision-language model trained on 100,000 preference pairs
                with a Gemini rubric judge <R n={15} />. TryOnReward released about 100,000 human ratings for this purpose{" "}
                <R n={42} />.
              </>
            ),
          },
          {
            k: "Distillation and caching for speed.",
            t: (
              <>
                FastFit caches garment features for a 3.5× speed-up, DirectTryOn generates in one step in 0.48 seconds, and
                Tstars-Tryon serves in about 3.9 seconds after step distillation <R n={[38, 43, 3]} />.
              </>
            ),
          },
          {
            k: "Small specialists remain competitive.",
            t: (
              <>
                FASHN VTON 1.5 generates directly in pixel space with 972 million parameters and no autoencoder. FASHN states
                it can be trained from scratch for USD 5,000 to 10,000 <R n={[30, 44]} />. Pixel-space generation avoids the
                eight-fold compression that blurs fine print.
              </>
            ),
          },
        ]}
      />

      <H2 id="industry" n="2.5">
        Industrial landscape
      </H2>
      <T
        n="Table 7"
        title="How leading companies build and deploy try-on"
        head={["Organisation", "System", "Public facts on architecture and data", "Deployment"]}
        rows={[
          ["Google", "TryOnDiffusion; Search try-on; Vertex virtual-try-on-001", "Two-UNet cascade to 1024 pixels, about 4 million pairs; later described as a custom fashion image model", <>US Search from July 2025; UK and India from December 2025; enterprise API with SynthID watermarking <R n={14} /></>],
          ["FASHN AI", "VTON 1.5 open weights; API v1.6; Try-On Max", "972M pixel-space transformer; 18 million pairs plus 4 million synthetic triplets", <>API at 864×1296; USD 0.075 per image on demand <R n={45} /></>],
          ["Alibaba (Taobao)", "Tstars-Tryon 1.0", "5B transformer; pre-training, fine-tuning and reinforcement learning; up to six references", "Taobao app, several million users, about 3.9 seconds"],
          ["JD.com", "Oxygen-TryOn", "16B transformer; 50 million raw images; learned reward plus a vision-language judge", "Weights announced as forthcoming"],
          ["ByteDance", "Seedream 4.0", "General editor marketed for multi-garment try-on at up to 4K", <>API <R n={46} /></>],
          ["Inditex", "Zara Try-On", "Avatar from the shopper's photos; vendor not disclosed", "More than 7 million sessions in 43 markets"],
          ["Meesho", "Saree try-on with Google Cloud", "Warping, 3D rendering and Imagen, announced in 2024", <>Announced as coming soon <R n={47} /></>],
        ]}
      />
      <p>
        Industrial try-on is now deployed across North America, Europe and Asia. This review found no public disclosure from
        these organisations of try-on quality broken down by skin tone or body shape, and no deployed generative try-on built
        for draped garments: Meesho&apos;s announced saree try-on relied on warping and 3D rendering rather than a generative
        try-on model <R n={47} />.
      </p>

      <H2 id="foundations" n="2.6">
        Open foundation models and their licences
      </H2>
      <p>
        For a company, the licence of the base model decides what can be sold. A LoRA inherits its base model&apos;s terms, and
        some licences also restrict using a model&apos;s outputs to train other models.
      </p>
      <T
        n="Table 8"
        title="Candidate base models for a commercial try-on model"
        dense
        head={["Model", "Released", "Size", "Person and garment as separate inputs", "Licence", "Commercial use"]}
        rows={[
          [<>Qwen-Image-Edit-2511 <R n={48} /></>, "Dec 2025", "20B MMDiT", "Yes, native multi-image", "Apache-2.0", "Yes"],
          [<>FLUX.2 klein base 4B <R n={49} /></>, "Jan 2026", "4B", "Yes, multi-reference", "Apache-2.0", "Yes"],
          ["FASHN VTON 1.5", "Jan 2026", "972M", "Built for try-on", "Apache-2.0; parser non-commercial", "Yes, after parser replacement"],
          [<>LongCat-Image-Edit <R n={50} /></>, "Dec 2025", "6B", "One image; use a side-by-side canvas", "Apache-2.0", "Yes"],
          [<>HiDream-O1-Image <R n={51} /></>, "May 2026", "8B, pixel space", "One reference for editing", "MIT", "Yes"],
          ["Qwen-Image-2.1", "Sep 2026", "7B", "Up to 10 references", "Qwen Research License", "No"],
          ["FLUX.1 Kontext dev, FLUX.2 dev, klein 9B", "2025 to 2026", "12B, 32B, 9B", "Yes", "FLUX Non-Commercial", "No"],
          ["HunyuanImage 3.0", "Jan 2026", "80B MoE", "Up to 3 images", "Tencent community licence", "Restricted by region; outputs may not improve other models"],
          ["Stable Diffusion 3.5", "Oct 2024", "8.1B and 2.5B", "No native editing", "Stability Community", "Only under USD 1M revenue"],
        ]}
      />

      <H2 id="datasets" n="2.7">
        Datasets and their licences
      </H2>
      <T
        n="Table 9"
        title="Try-on datasets and whether they permit commercial training"
        head={["Dataset", "Content", "Commercial training"]}
        rows={[
          ["VITON-HD", "13,679 upper-body pairs at 1024×768", "No. CC BY-NC 4.0"],
          ["DressCode", "About 54,000 garments across three categories", "No. Not released to private companies"],
          ["DeepFashion, DeepFashion-MultiModal", "About 800,000 and 44,000 images", "No. Research use only"],
          ["StreetTryOn", "About 12,400 street images", "No. Commercial use prohibited"],
          ["SHHQ", "About 40,000 full-body images", "No. Research use only"],
          ["IGPair", "More than 300,000 pairs", "No. Academic and personal use"],
          ["IndoFashion", "106,000 images in 15 Indian ethnic categories, for classification", "Unclear. Images gathered from e-commerce and web search"],
          ["BD-VITON", "1,013 pairs of Bangladeshi garments", "No clear commercial terms. The paper is CC BY-NC-SA 4.0; no separate dataset licence is stated"],
          [<>Garments2Look <R n={52} /></>, "About 80,000 multi-garment outfits", "Risky. About half synthesised with a commercial API, the rest from web images"],
        ]}
      />
      <p>
        None of these datasets clearly permits commercial training. Evaluation on the public datasets is possible only where
        their terms allow research use. A commercial model must be trained on data that FabricVTON owns or licenses.
      </p>

      <H2 id="evaluation" n="2.8">
        How try-on is evaluated, and where evaluation falls short
      </H2>
      <p>
        FID and KID measure whether outputs look like real photographs, not whether the right garment was transferred. SSIM
        and LPIPS need a ground-truth photograph and are dominated by the background. OpenVTON-Bench measured agreement with
        human rankings at Kendall τ of 0.611 for SSIM, against 0.833 for its own metric combining a vision-language judge and
        segmentation <R n={53} />.
      </p>
      <p>
        Several try-on benchmarks appeared in 2025 and 2026: VTBench, VTONQA, OpenVTON-Bench, VTON-QBench with 431,800 human
        annotations, VTEdit-Bench and TryOnReward <R n={[54, 55, 56]} />. They improve on classic metrics, but none covers
        draped garments, and none reports results by skin tone or body shape. A new general-purpose benchmark would not be
        novel on its own. One that spans garments from many regions, includes real shoppers&apos; photos, is stratified by skin
        tone and body shape, and is built from consented, licensed photographs would be.
      </p>
    </>
  );
}
