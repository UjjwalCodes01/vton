import { Callout, H2, R, T } from "../_components/Doc";
import { CostFigure } from "../_components/figures";

export const toc = [
  { id: "returns", label: "Returns and fit uncertainty" },
  { id: "mainstream", label: "Try-on is mainstream" },
  { id: "narrow-wardrobe", label: "A narrow wardrobe" },
  { id: "fairness", label: "Fairness is unmeasured" },
  { id: "licensing", label: "Licensing blocks the obvious path" },
  { id: "starting-point", label: "FabricVTON's starting point" },
  { id: "move", label: "Shoppers want to see garments move" },
  { id: "statement", label: "Problem statement" },
];

export const sources = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 60, 70, 71, 72, 73, 74, 75, 76, 77];

export function Body() {
  return (
    <>
      <H2 id="returns" n="1.1">
        Returns and fit uncertainty in online apparel
      </H2>
      <p>
        Apparel is the category where online shopping most often fails. Coresight Research found an average return rate of
        24.4% for online apparel orders in the United States over the twelve months to March 2023, and 53% of the 100
        apparel brand and retail decision-makers it surveyed named size and fit as the top reason <R n={1} />. Across all US
        retail, the National Retail Federation and Happy Returns expect USD 849.9 billion of merchandise to be returned in
        2025, equal to 15.8% of annual sales, with online sales returned at a rate of 19.3% <R n={8} />.
      </p>
      <p>
        Every return carries reverse shipping, inspection, repackaging and markdown costs, and some returned apparel is never
        resold. The root cause is the shopper&apos;s uncertainty about how a garment will look on their own body. A studio
        photograph on a professional model cannot answer that question, in any market.
      </p>
      <T
        n="Table 2"
        title="Market indicators"
        head={["Indicator", "Value", "Source"]}
        rows={[
          ["US online apparel return rate", "24.4%, twelve months to March 2023", <>Coresight <R n={1} /></>],
          ["Apparel sellers naming size and fit as the top return reason", "53% of 100 surveyed", <>Coresight <R n={1} /></>],
          ["Expected US retail returns, 2025", "USD 849.9 billion, 15.8% of annual sales", <>NRF <R n={8} /></>],
          ["Expected US online return rate, 2025", "19.3%", <>NRF <R n={8} /></>],
          ["Global virtual fitting room market", "USD 5.57 billion in 2024, USD 20.65 billion by 2030, 24.6% annual growth from 2025 to 2030", <>Grand View Research <R n={9} /></>],
          ["Live Shopify stores in apparel", "837,944, of which about 291,700 sell 100 or more products", <>Store Leads <R n={10} /></>],
          ["Live WooCommerce stores in apparel", "345,004", <>Store Leads <R n={11} /></>],
        ]}
        note="Store Leads counts change daily; these are as updated on 25 September 2026 and cover stores in every country. Return figures are for the United States, where the most reliable public data exists."
      />

      <H2 id="mainstream" n="1.2">
        Virtual try-on has become mainstream
      </H2>
      <p>
        Generative virtual try-on renders a garment onto a photograph of the shopper. It moved from research to mass-market
        products in about three years. Google launched try-on from a shopper&apos;s own photo in US Search in July 2025 and
        extended it to the United Kingdom and India in December 2025 <R n={[12, 2]} />. Inditex reports more than seven
        million sessions of Zara Try-On across 43 markets <R n={13} />. Alibaba&apos;s Tstars-Tryon runs inside the Taobao app
        and has served several million users <R n={3} />. Google Cloud now sells a dedicated try-on model to enterprises{" "}
        <R n={14} />.
      </p>
      <p>
        Shoppers in many markets are therefore learning to expect try-on. The open question is whether the technology works
        for everyone: for every garment shoppers actually buy, and for every body that wears it.
      </p>

      <H2 id="narrow-wardrobe" n="1.3">
        Current models are built for a narrow wardrobe
      </H2>
      <p>
        Most try-on research treats a garment as a single stitched piece with a fixed shape, such as a T-shirt, a dress or a
        pair of trousers, photographed flat or on a studio model. VITON-HD, the standard benchmark, contains only upper-body
        garments <R n={4} />. Real catalogues and real shoppers are far more varied, in six ways that matter to a generative
        model.
      </p>
      <T
        n="Table 3"
        title="Why real-world garments and photos are hard for current try-on models"
        head={["Property", "Examples", "Why current models struggle"]}
        rows={[
          ["Layering and outerwear", "Coats, jackets and cardigans worn open over other clothes; tucked and untucked shirts", <>The new garment must sit over or under layers that have to be kept. Recent work names complex layered try-on as unsolved <R n={[15, 16]} />.</>],
          ["Multi-piece outfits", "Suits, co-ords, and sets worn with a scarf, shawl or dupatta", <>Several items must be placed consistently from several reference images, which recent work also names as unsolved <R n={[15, 16]} />.</>],
          ["Draped and wrapped garments", "Saree, dhoti, sarong, shawls and wrap dresses", <>The final shape is created by folding and wrapping on the body. The same fabric yields different silhouettes, so a model cannot copy a fixed outline <R n={6} />.</>],
          ["Dense detail", "Printed text and logos, embroidery, lace, sequins, woven and block-printed motifs", <>Latent autoencoders compress images eight-fold, and papers report the loss of small text and fine patterns as a result <R n={[17, 18]} />.</>],
          ["Ill-posed product images", "Garments sold folded, on hangers or mannequins, as flat fabric, or shown from the front only", "The garment photo does not show how the garment looks when worn, or from behind. Standard try-on assumes that it does."],
          ["Real shoppers' photos", "Phone selfies, mirror shots, dim light, and hands, bags or phones across the body", <>Studio training photos do not match what shoppers upload. In-the-wild datasets and methods address this only in part <R n={60} />.</>],
        ]}
      />
      <p>
        Evidence of these gaps is uneven. Layering and in-the-wild photos now have dedicated papers, but garments outside the
        stitched Western wardrobe have almost none. BD-VITON, published in March 2026, is the only try-on benchmark for
        culturally specific clothing found in this review. It covers Bangladeshi sarees, panjabi and salwar kameez in 1,013
        pairs, retrains three models released before 2024, and is not cleared for commercial use <R n={6} />. DIVA, a 2024
        workshop paper, studied Indian try-on at 720×540 resolution <R n={20} />, and IndoFashion offers 106,000 images of
        Indian ethnic wear for classification, with no try-on pairs <R n={19} />. A widely used curated list of try-on
        research, updated in September 2026, has no entry on draped or cultural garments <R n={21} />. Beyond these, this
        review found no try-on benchmark for the garment traditions of other regions.
      </p>

      <H2 id="fairness" n="1.4">
        Representation and fairness are unmeasured
      </H2>
      <p>
        Try-on models change pixels on a person&apos;s body, so they can alter the person as well as the garment. SiCo reports
        that try-on training sets are dominated by slim bodies <R n={22} />. This review found no published fairness audit of
        try-on models by skin tone or body shape. Industry recognises the issue: when Google launched apparel try-on in 2023,
        it chose its models across the Monk Skin Tone scale and sizes XXS to 4XL <R n={[23, 24]} />.
      </p>
      <p>
        For shoppers everywhere the risks are concrete: skin tone drifting lighter, a body reshaped toward a slimmer norm, or
        the loss of personal and cultural details such as tattoos, jewellery, a headscarf or turban, mehndi or a bindi. None
        of these is captured by the metrics the field reports today, and a try-on product that serves a global market has to
        be measured against all of them.
      </p>

      <H2 id="licensing" n="1.5">
        Licensing blocks the obvious path
      </H2>
      <p>
        A company cannot simply download the best research model and adapt it. VITON-HD is licensed CC BY-NC 4.0, and
        DressCode is not released to private companies <R n={[4, 5]} />. Leading open try-on checkpoints, including
        OOTDiffusion, IDM-VTON, CatVTON and FitDiT, are released under CC BY-NC-SA 4.0 <R n={[25, 26, 18, 27]} />. The newest
        strong open image editor, Qwen-Image-2.1, uses a research-only licence, and most FLUX models use a non-commercial
        licence that extends to fine-tuned derivatives <R n={[28, 29]} />. A commercial try-on model for a global market
        therefore needs its own data and a carefully chosen base model.
      </p>

      <H2 id="starting-point" n="1.6">
        FabricVTON&apos;s starting point
      </H2>
      <p>
        FabricVTON runs photo try-on as a managed GPU service with automatic garment-category detection, request batching
        and measured cost reporting <R n={7} />. This engineering is valuable, and it also shows clearly what is missing:
      </p>
      <ul>
        <li>
          <strong>No model trained on FabricVTON&apos;s own data yet.</strong> The production model is an open checkpoint that
          knows three garment categories: tops, bottoms and one-pieces <R n={30} />. Its behaviour on layered, multi-piece and
          draped garments, and across skin tones and body shapes, has not been measured.
        </li>
        <li>
          <strong>Resolution is limited.</strong> The current model generates at 576×864, and its authors list resolution
          and traces of the previous garment among its known limitations <R n={30} />.
        </li>
        <li>
          <strong>Quality evidence is thin.</strong> Speed optimisations have so far been judged by eye on a few image pairs,
          which is not enough evidence for a research or product claim.
        </li>
        <li>
          <strong>No video or live capability of its own.</strong> The model draws one still image in about 6.5 seconds;
          live try-on needs a new frame every 33 to 66 milliseconds. FabricVTON&apos;s live page currently runs on a licensed
          third-party engine.
        </li>
      </ul>

      <H2 id="move" n="1.7">
        Shoppers want to see garments move
      </H2>
      <p>
        A photo shows how a garment looks standing still. Shoppers also want to see how it moves, hangs and fits when they
        turn, walk or raise an arm, and on their own camera rather than in an uploaded photo. Live try-on has just become
        possible. Decart&apos;s live try-on model, Lucy VTON 3.5, redraws each camera frame at 720p, and Decart has raised more
        than USD 450 million <R n={[72, 73]} />. Google&apos;s Doppl app turned try-on photos into short videos before it closed
        in April 2026 and moved into Search, and FASHN, Luma and Runway now offer offline video try-on or wardrobe editing{" "}
        <R n={[74, 75, 76, 77]} />.
      </p>
      <p>The engines are closed and costly. The figure and table below compare one try-on on each path.</p>
      <CostFigure n="Figure 1.1" />
      <T
        n="Table 4"
        title="The cost gap between photo and live try-on"
        head={["Path", "Unit cost", "Cost of a typical use"]}
        rows={[
          ["Photo try-on on FabricVTON's own L4", <>USD 0.019 per image, measured <R n={7} /></>, "USD 0.019 per garment tried"],
          ["Live try-on on Decart's engine", <>USD 1.20 per minute, list price <R n={70} /></>, "USD 1.80 for a 90-second session"],
          ["Live try-on on FabricVTON's own model", "About USD 0.07 per minute, target", "About USD 0.10 for a 90-second session"],
        ]}
        note="The target is a planning estimate, not a measurement. It assumes one live stream per NVIDIA H100 at a cloud list price of about USD 4.40 an hour including CPU and memory, fully used. At 60% utilisation it rises to about USD 0.12 a minute, still a tenth of the rented engine."
      />
      <p>
        The one open research system for live video try-on, LiveVVT, reaches about 22 frames per second at 512×384, but it
        still needs a body mask and pose map for every frame and no code had been released as of September 2026{" "}
        <R n={71} />. A commercial live model therefore has to be built, and built on data a company can legally use.
      </p>

      <H2 id="statement" n="1.8">
        Problem statement
      </H2>
      <Callout label="Problem statement" tone="dark">
        There is no reliable way to measure, and no commercially usable model to deliver, faithful virtual try-on for any
        garment a shopper might buy, in a photo or in live video, across the full range of skin tones, body shapes and
        real-world conditions. This programme sets out to provide both, with live video as the end goal.
      </Callout>
    </>
  );
}
