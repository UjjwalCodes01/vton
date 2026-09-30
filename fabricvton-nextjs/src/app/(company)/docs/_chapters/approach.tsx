import { H2, Points, R, T } from "../_components/Doc";
import { SkinScaleFigure, SystemFigure } from "../_components/figures";

export const toc = [
  { id: "objectives", label: "Objectives" },
  { id: "principles", label: "Design principles" },
  { id: "system", label: "System overview" },
  { id: "wp1", label: "WP1 Benchmark and fairness audit" },
  { id: "wp2", label: "WP2 Data engine" },
  { id: "wp3", label: "WP3 Model adaptation" },
  { id: "wp4", label: "WP4 Preference tuning and distillation" },
];

export const sources = [3, 7, 15, 16, 24, 27, 36, 48, 61, 62];

export function Body() {
  return (
    <>
      <H2 id="objectives" n="3.1">
        Objectives
      </H2>
      <T
        n="Table 16"
        title="Programme objectives"
        head={["ID", "Objective", "How success is measured", "Month"]}
        rows={[
          ["O1", "Build and release a licensed, consented global try-on benchmark", "At least 2,000 image test pairs across at least eight garment families from at least five world regions, labelled for garment attributes, Monk Skin Tone and body shape", "5"],
          ["O2", "Audit current try-on systems on the benchmark", "At least ten open and commercial systems, a human study with raters from several regions, and the agreement between automatic metrics and those raters", "6"],
          ["O3", "Build a commercially clean training pipeline and image model", "At least 20,000 real and synthetic pairs with provenance, and a LoRA fine-tune of Qwen-Image-Edit-2511", "8"],
          ["O4", "Beat the best open image baseline at a servable cost", "A statistically significant win in human-rated garment fidelity with no loss on standard metrics, and a distilled model within twice today's 6.5 seconds on an L40S", "11"],
          ["O5", "Build a commercially clean video try-on model", "A video training set of at least 7,000 real clips and 20,000 verified synthetic pairs with provenance, and an offline model that beats open video baselines on garment fidelity over time on the 300-clip hold-out", "13"],
          ["O6", "Deliver live try-on on FabricVTON's own model", "At least 15 frames per second at 512p with the first frame in under 2 seconds on one GPU, garment fidelity close to the offline model, and a cost per stream-minute under a tenth of the rented engine", "16"],
        ]}
      />

      <H2 id="principles" n="3.2">
        Design principles
      </H2>
      <Points
        items={[
          { k: "Measure before modelling.", t: "The benchmark and evaluation harness come first, so every model decision is scored across garment families, photo conditions and diverse bodies." },
          { k: "Commercially clean by construction.", t: "Only Apache-2.0 or MIT bases and teachers, licensed or consented data, and a provenance record for every training sample." },
          { k: "Coverage and fairness, not raw scale.", t: "A small team cannot match 50 million images. It can build the most diverse and best-measured data for the garments, bodies and photos that large players' published results leave out." },
          { k: "Large teacher, small student.", t: "Train the best model on a 20-billion-parameter base, then distil it into a model cheap enough to serve on L4 and L40S GPUs." },
          { k: "Open science where it helps the field.", t: "Publish methods, the benchmark and the evaluation toolkit. Keep the production model and licensed training data proprietary." },
          { k: "Image first, live video as the goal.", t: "The image model comes first because it teaches the video model: it re-dresses real clips to make training pairs. Every image-track decision is judged by whether it also serves the video track." },
        ]}
      />

      <H2 id="system" n="3.3">
        System overview
      </H2>
      <p>
        Figure 1 shows how the seven work packages connect. The image track turns licensed data into a servable image model.
        The video and live track reuses that model as a teacher and ends in live try-on. The measurement track scores every
        checkpoint in both.
      </p>
      <SystemFigure n="Figure 1" />
      <T
        n="Table 17"
        title="Work packages"
        head={["WP", "Name", "Purpose", "Lead role"]}
        rows={[
          ["WP1", "Benchmark and fairness audit", "Measure how current systems perform across garment families, regions, photo and video conditions and diverse bodies", "Evaluation lead"],
          ["WP2", "Data engine", "Build commercially clean image training pairs with provenance", "Data and consent lead"],
          ["WP3", "Image model", "Fine-tune Qwen-Image-Edit-2511 for try-on of any garment", "Modelling lead"],
          ["WP4", "Tuning and distillation", "Align with human preference and make image serving affordable", "Modelling and infrastructure leads"],
          ["WP5", "Dissemination and transfer", "Papers, releases and product integration", "Founders"],
          ["WP6", "Video try-on model", "Build commercially clean video data and an offline video try-on model", "Video lead"],
          ["WP7", "Live try-on", "Turn the video model into a live, streaming model and serve it", "Video and infrastructure leads"],
        ]}
      />

      <H2 id="wp1" n="3.4">
        WP1: Benchmark and fairness audit
      </H2>
      <p>
        The benchmark is a test set built from new, licensed photography and licensed partner catalogues. Each item pairs a
        photograph of a consenting model with a garment presented in one of four ways: flat or unfolded, folded as sold, on a
        hanger or mannequin, or worn by another person, with a back view wherever it differs from the front. This lets the
        benchmark measure how much the garment presentation drives failure, separately from the model. Person photographs
        come in two conditions, studio and real-shopper (phone selfies, mirror shots and dim light), so the benchmark also
        measures how much the photo drives failure. Subjects are balanced across all ten groups of the Monk Skin Tone scale
        and across body shapes, including plus sizes <R n={24} />.
      </p>
      <SkinScaleFigure n="Figure 3.1" />
      <T
        n="Table 18"
        title="Benchmark garment taxonomy and labelled attributes"
        head={["Garment family", "Examples", "Attributes labelled"]}
        rows={[
          ["Tops", "T-shirts, shirts, blouses, knitwear, hoodies", "Fit, neckline, sleeve length, print, logo and text fidelity"],
          ["Bottoms", "Jeans, trousers, skirts, shorts", "Rise, length, silhouette, waistband, wash and texture"],
          ["One-pieces", "Dresses, jumpsuits", "Length, flare, silhouette, pattern fidelity"],
          ["Outerwear and layering", "Coats, jackets, blazers and cardigans, worn open or closed over an existing outfit", "Layer order, inner-layer preservation, closures, collar and lapels"],
          ["Tailoring and formalwear", "Suits, waistcoats, formal gowns, sherwani", "Structure, closures, fabric drape, embroidery"],
          ["Multi-piece outfits", "Co-ords, kurta sets, lehenga with choli and dupatta", "Consistency across pieces, layering, scarf or dupatta placement"],
          ["Draped and wrapped garments", "Saree in several drape styles, dhoti, sarong, shawls, wrap dresses", "Drape and fold, pleats, border continuity, decorated ends such as the pallu"],
          ["Regional dress", "Kimono and yukata, hanbok, qipao, kaftan and abaya, dashiki, salwar kameez", "Structure, closures, embroidery and motif fidelity, cultural details"],
          ["Preservation checks", "All items", "Face, hands, hair, tattoos, jewellery, headscarves and turbans, mehndi and bindi, skin tone, body shape"],
        ]}
      />
      <p>
        At least ten systems will be audited without retraining. Open specialists include FASHN VTON 1.5, CatVTON, IDM-VTON,
        Leffa, FitDiT and OmniTry. Open general editors include Qwen-Image-Edit-2511 and FLUX.2 klein base 4B. Commercial APIs,
        such as FASHN&apos;s API and Google&apos;s virtual-try-on-001, will be included where their terms allow evaluation.
        Checkpoints with non-commercial licences will be run only where their terms allow research evaluation, and their
        results will appear only in publications.
      </p>
      <p>
        Every subject signs a consent form covering AI training, evaluation and publication, in line with India&apos;s Digital
        Personal Data Protection Act and, for subjects in the United Kingdom or the European Union, the UK GDPR and the GDPR.
        Faces are anonymised in the public release where consent does not cover publication, and the release carries a
        datasheet.
      </p>
      <p>
        The benchmark also has a <strong>video hold-out of about 300 clips</strong>, with people and garments kept out of all
        training data: 100 studio clips, 100 consented phone clips, and 100 live-camera stress clips recorded on a webcam, with
        low light, fast spins, hands and bags across the body, back turns and sequences of a minute or more.
      </p>

      <H2 id="wp2" n="3.5">
        WP2: Data engine
      </H2>
      <T
        n="Table 19"
        title="Training data sources and licence position"
        head={["Source", "What it provides", "Licence position", "Role"]}
        rows={[
          ["Licensed photoshoots", "Product views (front, back and detail) plus two to four on-model poses per garment, on several models; folded, hanger and close-up views where a garment is sold that way", "Owned, with model releases that cover AI training", "Real pairs for high-value fine-tuning"],
          ["Brand catalogue licences", "On-model and product photos from direct-to-consumer partners in several regions", "Licensed with an explicit machine-learning clause", "Volume and diversity"],
          ["Licensed stock photography", "Person photographs across regions, skin tones and body shapes", "Licensed, with model releases that cover AI training", "Subject diversity"],
          ["Synthetic triplets", "A real photo re-dressed by a teacher model becomes the input; the real photo stays the target", "Teachers are Apache-2.0: FASHN VTON 1.5 and Qwen-Image-Edit-2511", "Mask-free training at scale"],
          ["Try-off generation", "A flat garment image generated from a worn photo", "Generated with an Apache-2.0 model", "Pairs from catalogues that only have on-model shots"],
          ["Public research datasets", "VITON-HD, DressCode", "Non-commercial", "Evaluation only, never training"],
        ]}
      />
      <p>
        Every sample enters a provenance ledger that records its source, licence, consent reference and any teacher model.
        Filters remove low-quality and duplicate pairs, and each batch is spot-checked by hand. The target is at least 20,000
        training pairs, balanced across garment families and subjects. Generating 500,000 candidate synthetic triplets with the
        current teacher would cost about USD 2,000, based on the measured 6.5 seconds per try-on on an L40S billed at USD 2.27
        per hour <R n={7} />.
      </p>

      <H2 id="wp3" n="3.6">
        WP3: Model adaptation
      </H2>
      <h3>Base model</h3>
      <p>
        Qwen-Image-Edit-2511 is the base model for four reasons. It is licensed Apache-2.0, with no restriction on outputs. It
        accepts several input images natively, so the person and each garment view can be supplied separately. It is the base
        used by strong 2026 try-on work, including Layering VTON at ECCV 2026. And it is supported by the main open training
        tools, including musubi-tuner <R n={[48, 16, 61]} />. FLUX.2 klein base 4B, also Apache-2.0, is kept as the student
        model for serving.
      </p>
      <h3>Conditioning on several views of one garment</h3>
      <p>
        The central modelling idea addresses the ill-posed inputs described in the problem chapter. Instead of one garment
        photograph, the model receives several views of the same garment: the front and the back, a close-up of any print,
        logo or embroidery, and, for a draped or wrapped garment, the unfolded fabric and its decorated border or end. For a
        multi-piece outfit it receives each piece. A short instruction names the garment type and how it is worn, for example
        a coat worn open over a shirt, or a saree in a Nivi drape. The research question is whether this multi-view
        conditioning, together with the wear instruction, recovers detail that a single product photograph cannot supply.
      </p>
      <h3>Training recipe</h3>
      <T
        n="Table 20"
        title="Initial training configuration"
        head={["Setting", "Value", "Basis"]}
        rows={[
          ["Adapter", "LoRA, rank 32 and alpha 32, on the query, key and value projections", "Layering VTON"],
          ["Optimiser", "Learning rate 1×10⁻⁴, constant, no warm-up", "Layering VTON"],
          ["Batch and precision", "Global batch 32, bf16 mixed precision", "Layering VTON"],
          ["Stage 1", "About 20,000 steps on synthetic triplets", "Layering VTON scale"],
          ["Stage 2", "About 5,000 steps on licensed real pairs", "Layering VTON scale"],
          ["Stage 3", "High-resolution stage for fine print, logos and embroidery", "TAMF-VTON, FitDiT"],
          ["Hardware", "One H200, or one H100 with FP8 weights", "Layering VTON; musubi-tuner reports about 42 GB without options and 30 GB with FP8"],
          ["Ablations", "Single versus multi-view garments; with and without the wear instruction; frequency-domain texture loss; attention-correspondence loss", "FitDiT, TAMF-VTON, Leffa"],
        ]}
      />

      <H2 id="wp4" n="3.7">
        WP4: Preference tuning and distillation
      </H2>
      <p>
        Once supervised fine-tuning works, a panel of raters from several regions will compare outputs in pairs. Their
        judgements will train a small reward model or calibrate a vision-language judge, which then guides reinforcement
        learning of the kind used by Tstars-Tryon and Oxygen-TryOn <R n={[3, 15]} />. This stage improves the product and is
        optional for the papers.
      </p>
      <p>
        A 20-billion-parameter model is expensive to serve. The programme will first test the Apache-2.0 four-step Lightning
        LoRA for Qwen-Image-Edit-2511, then distil the fine-tuned model into FLUX.2 klein base 4B <R n={62} />. The target is a
        distilled model within twice today&apos;s measured 6.5 seconds on an L40S, measured with FabricVTON&apos;s existing speed
        laboratory. The same work package replaces a third-party component in the current serving pipeline with a
        commercially licensed one.
      </p>
    </>
  );
}
