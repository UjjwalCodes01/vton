import Image from "next/image";

/**
 * Explanatory figures for the research, journal and product pages. All drawn here (SVG or HTML), in the brand
 * palette, so they scale, stay sharp and carry no third-party image rights. Photos come only from the Clothsy AI
 * demo set that the homepage already uses. None of these show measured results.
 */

const INK = "#18191b";
const LINE = "#d9d2c6";
const PANEL = "#f2efe9";
const BEIGE = "#dccfc0";
const BEIGE_SOFT = "#f1ece3";
const PURPLE = "#6738f5";
const PURPLE_SOFT = "#eee9fe";
const GRAPHITE = "#252932";

function Fig({
  n,
  caption,
  children,
  wide,
  frame = "white",
}: {
  n?: string;
  caption: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  frame?: "white" | "panel" | "none";
}) {
  return (
    <figure className={`fv-fig${wide ? " fv-fig--wide" : ""}`}>
      {frame === "none" ? children : <div className={`fv-fig-frame${frame === "panel" ? " fv-fig-frame--panel" : ""}`}>{children}</div>}
      <figcaption>
        {n ? <b>{n}</b> : null}
        {caption}
      </figcaption>
    </figure>
  );
}

/* ---- The try-on task, with real Clothsy demo images ----------------------- */
export function TryOnTask({ n = "Figure 1" }: { n?: string }) {
  return (
    <Fig
      n={n}
      wide
      caption="The task. A person photo and a product photo go in; a new image of that person wearing that product comes out. Images: the Clothsy AI demo set."
    >
      <div className="fv-tryfig">
        <div className="fv-tryfig-item">
          <div className="fv-tryfig-img">
            <Image src="/brand/clothsy/person.webp" alt="Person photo (input)" width={720} height={995} sizes="200px" unoptimized />
          </div>
          <span className="fv-tryfig-cap">Person photo</span>
        </div>
        <div className="fv-tryfig-item">
          <div className="fv-tryfig-img fv-tryfig-img--contain">
            <Image src="/brand/clothsy/garment-flat.webp" alt="Product photo of a garment (input)" width={480} height={639} sizes="200px" unoptimized />
          </div>
          <span className="fv-tryfig-cap">Product photo</span>
        </div>
        <div className="fv-tryfig-op" aria-hidden="true">
          <span>→</span>
          <span>Model</span>
        </div>
        <div className="fv-tryfig-item fv-tryfig-item--out">
          <div className="fv-tryfig-img">
            <Image src="/brand/clothsy/result.webp" alt="Generated try-on result (output)" width={720} height={995} sizes="260px" unoptimized />
          </div>
          <span className="fv-tryfig-cap">Generated try-on</span>
        </div>
      </div>
      <div className="fv-tryfig-keys">
        <p className="fv-tryfig-key">
          <b>Keep from the person</b>
          Face and identity, pose, body shape, skin, hair, background.
        </p>
        <p className="fv-tryfig-key fv-tryfig-key--p">
          <b>Take from the product</b>
          Garment shape, colour, fabric texture, print, logos, details like buttons and seams.
        </p>
      </div>
    </Fig>
  );
}

/* ---- Explicit warping vs implicit correspondence -------------------------- */
export function WarpVsAttention({ n }: { n?: string }) {
  const patches: Array<[number, number, boolean]> = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) patches.push([486 + c * 22, 78 + r * 30, r === 1 && c === 1]);
  const targets: Array<[number, number]> = [
    [640, 120], [656, 116], [672, 120], [640, 146], [656, 150], [672, 146], [642, 176], [656, 180], [670, 176], [644, 204], [656, 208], [668, 204],
  ];
  return (
    <Fig
      n={n}
      wide
      caption="Two ways to move a garment onto a body. Older systems warp the product image with an explicit transform, then blend it in. Diffusion systems learn the correspondence inside the network, through attention."
    >
      <svg viewBox="0 0 720 300" role="img" aria-label="Left: a flat shirt with a grid is warped into a curved shape. Right: garment patches connect by lines to regions of a body.">
        <defs>
          <clipPath id="wf-flat">
            <path d="M70 60 L100 60 Q110 76 120 60 L150 60 L185 90 L168 112 L150 100 L150 230 L70 230 L70 100 L52 112 L35 90 Z" />
          </clipPath>
          <clipPath id="wf-warp">
            <path d="M325 66 L352 62 Q362 78 373 64 L400 70 L432 104 L413 124 L398 110 Q404 170 392 232 L318 226 Q306 170 318 104 L302 116 L286 94 Z" />
          </clipPath>
          <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={PURPLE} />
          </marker>
        </defs>

        <text x="20" y="28" className="fv-svg-label">Explicit warp</text>
        <path d="M70 60 L100 60 Q110 76 120 60 L150 60 L185 90 L168 112 L150 100 L150 230 L70 230 L70 100 L52 112 L35 90 Z" fill={BEIGE_SOFT} stroke={INK} strokeWidth="1.3" />
        <g clipPath="url(#wf-flat)" stroke={BEIGE} strokeWidth="1">
          {[85, 100, 115, 130, 145].map((x) => <line key={x} x1={x} y1="55" x2={x} y2="235" />)}
          {[100, 130, 160, 190, 220].map((y) => <line key={y} x1="30" y1={y} x2="190" y2={y} />)}
        </g>
        <circle cx="110" cy="142" r="14" fill={PURPLE} />
        <line x1="200" y1="146" x2="262" y2="146" stroke={PURPLE} strokeWidth="1.6" markerEnd="url(#wf-arrow)" />
        <text x="231" y="136" textAnchor="middle" className="fv-svg-label">TPS</text>

        <path d="M325 66 L352 62 Q362 78 373 64 L400 70 L432 104 L413 124 L398 110 Q404 170 392 232 L318 226 Q306 170 318 104 L302 116 L286 94 Z" fill={BEIGE_SOFT} stroke={INK} strokeWidth="1.3" />
        <g clipPath="url(#wf-warp)" fill="none" stroke={BEIGE} strokeWidth="1">
          <path d="M333 96 Q326 165 332 232" />
          <path d="M348 94 Q344 165 348 232" />
          <path d="M363 94 Q362 165 363 232" />
          <path d="M378 96 Q380 165 377 232" />
          <path d="M393 100 Q399 165 391 232" />
          <path d="M300 110 Q360 120 420 112" />
          <path d="M300 140 Q358 152 420 142" />
          <path d="M300 170 Q358 180 420 170" />
          <path d="M300 200 Q358 208 420 200" />
        </g>
        <ellipse cx="359" cy="152" rx="12.5" ry="15" transform="rotate(-8 359 152)" fill={PURPLE} />
        <text x="20" y="266" className="fv-svg-small">
          <tspan x="20">Move a control grid, warp the product</tspan>
          <tspan x="20" dy="16">image, then blend it into the person.</tspan>
        </text>

        <line x1="460" y1="40" x2="460" y2="262" stroke={LINE} strokeDasharray="3 5" />

        <text x="486" y="28" className="fv-svg-label">Implicit correspondence</text>
        {patches.map(([x, y, p], i) => (
          <g key={i}>
            <line
              x1={x + 8}
              y1={y + 8}
              x2={targets[i][0]}
              y2={targets[i][1]}
              stroke={PURPLE}
              strokeOpacity={p ? 0.95 : 0.28}
              strokeWidth={p ? 1.6 : 1}
            />
            <rect x={x} y={y} width="16" height="16" rx="3" fill={p ? PURPLE : BEIGE_SOFT} stroke={p ? PURPLE : INK} strokeWidth="1" />
          </g>
        ))}
        <circle cx="656" cy="76" r="16" fill={PANEL} stroke={INK} strokeWidth="1.3" />
        <path d="M626 100 Q656 92 686 100 L690 222 Q656 230 622 222 Z" fill="none" stroke={INK} strokeWidth="1.3" />
        {targets.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={i === 4 ? PURPLE : INK} />)}
        <text x="486" y="266" className="fv-svg-small">
          <tspan x="486">Each output region looks up the</tspan>
          <tspan x="486" dy="16">garment features it needs.</tspan>
        </text>
      </svg>
    </Fig>
  );
}

/* ---- What makes fabric hard ------------------------------------------------ */
export function FabricFour({ n }: { n?: string }) {
  const panels = ["Print & logos", "Weave & sheen", "Drape & folds", "Layers & occlusion"];
  return (
    <Fig
      n={n}
      wide
      caption="Four properties a try-on image has to get right, and that pixel-level scores barely notice: printed detail, material appearance, how cloth hangs, and what covers what."
    >
      <svg viewBox="0 0 720 232" role="img" aria-label="Four panels: a printed shirt, a woven texture, draped folds, and overlapping layers.">
        <defs>
          <pattern id="ff-twill" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="8" height="8" fill={BEIGE_SOFT} />
            <rect width="4" height="8" fill={BEIGE} />
          </pattern>
          <linearGradient id="ff-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {panels.map((label, i) => (
          <g key={label} transform={`translate(${i * 182} 0)`}>
            <rect x="0" y="0" width="170" height="190" rx="14" fill={PANEL} />
            <text x="85" y="216" textAnchor="middle" className="fv-svg-label">
              {label}
            </text>
          </g>
        ))}

        {/* 1. print & logos */}
        <path d="M52 40 L72 40 Q85 54 98 40 L118 40 L142 62 L130 78 L118 70 L118 160 L52 160 L52 70 L40 78 L28 62 Z" fill="#fff" stroke={INK} strokeWidth="1.2" />
        <rect x="64" y="84" width="42" height="18" rx="2" fill={GRAPHITE} />
        <text x="85" y="97" textAnchor="middle" fontFamily="var(--fv-mono)" fontSize="10" fill="#fff" letterSpacing="1">
          FVTON
        </text>
        {[112, 120, 128].map((y) => <line key={y} x1="56" y1={y} x2="114" y2={y} stroke={PURPLE} strokeWidth="2.2" />)}

        {/* 2. weave & sheen */}
        <rect x="200" y="22" width="134" height="146" rx="8" fill="url(#ff-twill)" />
        <rect x="200" y="22" width="134" height="146" rx="8" fill="url(#ff-sheen)" />
        <circle cx="300" cy="56" r="20" fill="none" stroke={PURPLE} strokeWidth="1.3" strokeDasharray="3 3" />

        {/* 3. drape & folds */}
        <path d="M392 30 L482 30 L500 168 L374 168 Z" fill={BEIGE_SOFT} stroke={INK} strokeWidth="1.2" />
        <g fill="none" stroke={BEIGE} strokeWidth="2">
          <path d="M405 34 Q400 100 392 164" />
          <path d="M425 34 Q428 110 418 166" />
          <path d="M447 34 Q446 104 452 166" />
          <path d="M466 34 Q470 110 480 166" />
        </g>
        <path d="M374 168 Q390 158 404 168 Q420 178 436 168 Q452 158 468 168 Q484 178 500 168" fill="none" stroke={PURPLE} strokeWidth="1.6" />

        {/* 4. layers & occlusion */}
        <path d="M586 40 L636 40 L646 168 L576 168 Z" fill="#fff" stroke={INK} strokeWidth="1.2" />
        <path d="M566 36 L604 36 L600 168 L560 168 Z" fill={GRAPHITE} />
        <path d="M618 36 L656 36 L662 168 L622 168 Z" fill={GRAPHITE} />
        <path d="M560 112 Q600 100 640 118 L646 132 Q600 116 562 126 Z" fill={BEIGE} stroke={INK} strokeWidth="1" />
        <circle cx="648" cy="124" r="8" fill={BEIGE} stroke={INK} strokeWidth="1" />
      </svg>
    </Fig>
  );
}

/* ---- One garment, three poses ---------------------------------------------- */
function Figure({ x, arm, leg, lean }: { x: number; arm: [number, number]; leg: [number, number]; lean: number }) {
  return (
    <g transform={`translate(${x} 0) rotate(${lean} 60 120)`}>
      <circle cx="60" cy="34" r="15" fill={PANEL} stroke={INK} strokeWidth="1.2" />
      <line x1="40" y1="60" x2={40 + arm[0]} y2={60 + arm[1]} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1="80" y1="60" x2={80 - arm[0] * 0.2 + 30} y2={60 + arm[1] * 0.4 + 34} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="128" x2={50 + leg[0]} y2={128 + leg[1]} stroke={GRAPHITE} strokeWidth="9" strokeLinecap="round" />
      <line x1="70" y1="128" x2={70 - leg[0] * 0.3} y2={128 + leg[1]} stroke={GRAPHITE} strokeWidth="9" strokeLinecap="round" />
      <path d="M36 56 L84 56 L88 132 L32 132 Z" fill={BEIGE_SOFT} stroke={INK} strokeWidth="1.2" />
      <path d="M60 80 l5 10 11 1.6 -8 7.8 1.9 11 -9.9-5.2 -9.9 5.2 1.9-11 -8-7.8 11-1.6 z" fill={PURPLE} />
      <line x1="36" y1="120" x2="88" y2="120" stroke={BEIGE} strokeWidth="3" />
    </g>
  );
}
export function PoseRow({ n }: { n?: string }) {
  return (
    <Fig
      n={n}
      wide
      caption="Consistency. The same garment on the same person in three poses: the print, the colour and the hem stripe must match in every frame, even when the arms and the camera move."
    >
      <svg viewBox="0 0 720 250" role="img" aria-label="Three figures in different poses wearing the same top with a purple star print.">
        <Figure x={80} arm={[-26, 58]} leg={[-6, 70]} lean={0} />
        <Figure x={300} arm={[-44, -30]} leg={[-18, 66]} lean={-6} />
        <Figure x={520} arm={[-50, 18]} leg={[10, 68]} lean={7} />
        {[140, 360, 580].map((x) => (
          <g key={x} transform={`translate(${x - 86} 226)`}>
            {["Print", "Colour", "Hem"].map((t, i) => (
              <g key={t} transform={`translate(${i * 62} 0)`}>
                <circle cx="6" cy="0" r="6" fill={PURPLE_SOFT} />
                <path d="M3 0 l2 2.2 4-4.4" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round" />
                <text x="16" y="4" className="fv-svg-small" style={{ fontSize: 11 }}>
                  {t}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </Fig>
  );
}

/* ---- One garment, three bodies --------------------------------------------- */
export function DrapeFigure({ n }: { n?: string }) {
  const bodies = [
    { x: 110, w: 46, folds: 3, label: "Narrow" },
    { x: 360, w: 62, folds: 4, label: "Average" },
    { x: 610, w: 84, folds: 5, label: "Broad" },
  ];
  return (
    <Fig
      n={n}
      wide
      caption="Drape. The same dress on three body shapes. Where the fabric touches the body, where it falls free, and how many folds form all change with the body underneath."
    >
      <svg viewBox="0 0 720 250" role="img" aria-label="The same dress drawn on a narrow, an average and a broad body, with different folds.">
        {bodies.map((b) => {
          const top = b.w * 0.55;
          const hem = b.w * 1.35;
          const folds = Array.from({ length: b.folds }, (_, i) => -hem + ((i + 1) * 2 * hem) / (b.folds + 1));
          return (
            <g key={b.label} transform={`translate(${b.x} 0)`}>
              <circle cx="0" cy="26" r="14" fill={PANEL} stroke={INK} strokeWidth="1.2" />
              <path d={`M${-top} 48 L${top} 48 L${hem} 196 L${-hem} 196 Z`} fill={BEIGE_SOFT} stroke={INK} strokeWidth="1.2" />
              <path d={`M${-top * 0.9} 92 Q0 100 ${top * 0.9} 92`} fill="none" stroke={PURPLE} strokeWidth="1.4" />
              {folds.map((fx, i) => (
                <path key={i} d={`M${fx * 0.42} 100 Q${fx * 0.8} 150 ${fx} 194`} fill="none" stroke={BEIGE} strokeWidth="2" />
              ))}
              <path
                d={`M${-hem} 196 ${folds.map((fx, i) => `Q${fx - hem / (b.folds + 1)} ${i % 2 ? 190 : 204} ${fx} 196`).join(" ")} Q${hem - hem / (b.folds + 1)} 204 ${hem} 196`}
                fill="none"
                stroke={INK}
                strokeWidth="1.2"
              />
              <text x="0" y="232" textAnchor="middle" className="fv-svg-label">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Fig>
  );
}

/* ---- Many steps vs a few ------------------------------------------------------ */
export function StepsFigure({ n }: { n?: string }) {
  const many = Array.from({ length: 30 }, (_, i) => i);
  const few = [0, 1, 2, 3];
  const shade = (t: number) => {
    const a = [217, 210, 198];
    const b = [103, 56, 245];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  };
  return (
    <Fig
      n={n}
      wide
      caption="Why speed is a research problem. A diffusion model turns noise into an image over many denoising steps. Distillation trains a student that gets to a comparable image in a handful of steps, and the cost of a try-on falls with the step count."
    >
      <svg viewBox="0 0 720 210" role="img" aria-label="Top row: thirty small steps from noise to image. Bottom row: four large steps from noise to image.">
        <text x="0" y="22" className="fv-svg-label">Original sampler: dozens of steps</text>
        {many.map((i) => (
          <circle key={i} cx={12 + i * 23.4} cy="52" r="7" fill={shade(i / 29)} />
        ))}
        <text x="0" y="112" className="fv-svg-label">Distilled student: a handful of steps</text>
        {few.map((i) => (
          <circle key={i} cx={40 + i * 218} cy="152" r="26" fill={shade(i / 3)} />
        ))}
        {few.slice(0, 3).map((i) => (
          <path key={i} d={`M${72 + i * 218} 152 L${180 + i * 218} 152`} stroke={PURPLE} strokeWidth="1.3" strokeDasharray="4 5" />
        ))}
        <text x="0" y="202" className="fv-svg-small">
          Noise
        </text>
        <text x="720" y="202" textAnchor="end" className="fv-svg-small">
          Image
        </text>
      </svg>
    </Fig>
  );
}

/* ---- Flows (HTML) ------------------------------------------------------------- */
type Step = { k: string; title: string; text: string; tone?: "p" | "dark" };
function Flow({ steps, side }: { steps: Step[]; side?: { k: string; text: React.ReactNode } }) {
  return (
    <>
      <div className="fv-flow">
        {steps.map((s) => (
          <div key={s.title} className={`fv-flow-step${s.tone ? ` fv-flow-step--${s.tone}` : ""}`}>
            <span className="fv-flow-k">{s.k}</span>
            <span className="fv-flow-title">{s.title}</span>
            <span className="fv-flow-text">{s.text}</span>
          </div>
        ))}
      </div>
      {side ? (
        <p className="fv-flow-side">
          <b>{side.k}</b>
          <span>{side.text}</span>
        </p>
      ) : null}
    </>
  );
}

export function ResearchToProduct({ n }: { n?: string }) {
  return (
    <Fig
      n={n}
      caption="How work moves from a question to something a shopper uses, and how what we learn in production flows back into the research."
    >
      <Flow
        steps={[
          { k: "Research", title: "An open problem", text: "A failure people can see, turned into a question we can test." },
          { k: "Evaluation", title: "A benchmark first", text: "Decide how success is measured before building the fix." },
          { k: "Engineering", title: "A model that runs", text: "Fast and cheap enough for a live storefront.", tone: "p" },
          { k: "Product", title: "Clothsy AI", text: "Virtual try-on on Shopify and WooCommerce stores.", tone: "dark" },
        ]}
        side={{ k: "Feedback", text: "Where results fall short in real use, that becomes the next open problem." }}
      />
    </Fig>
  );
}

export function ProvenanceFlow({ n }: { n?: string }) {
  return (
    <Fig
      n={n}
      caption="Clean-provenance data. Every training sample should be traceable to a source we have the right to use, and shopper photos stay out of training entirely."
    >
      <Flow
        steps={[
          { k: "Sources", title: "Clear rights", text: "Catalogue images licensed for training, commissioned shoots, synthetic renders." },
          { k: "Checks", title: "Licence and consent", text: "Confirm commercial-use terms, and a signed release for every person shown." },
          { k: "Record", title: "Per-sample lineage", text: "Where each image came from and under what terms, kept with the data.", tone: "p" },
          { k: "Use", title: "Training set", text: "Only samples that pass every check.", tone: "dark" },
        ]}
        side={{ k: "Never in training", text: "Photos shoppers upload to try something on." }}
      />
    </Fig>
  );
}

/* ---- Timeline of the field (HTML) -------------------------------------------- */
const ERA_A = [
  { y: "2018", t: "VITON", n: "Clothing-agnostic person, TPS warp, refinement" },
  { y: "2018", t: "CP-VTON", n: "Learned geometric matching, composition mask" },
  { y: "2021", t: "VITON-HD", n: "1024×768, misalignment-aware normalization" },
  { y: "2022", t: "HR-VITON", n: "Warping and segmentation in one module" },
];
const ERA_B = [
  { y: "2023", t: "TryOnDiffusion", n: "Parallel-UNet, implicit warp by cross-attention" },
  { y: "2023", t: "LaDI-VTON", n: "Latent diffusion with textual inversion" },
  { y: "2024", t: "StableVITON", n: "Zero cross-attention correspondence" },
  { y: "2024", t: "IDM-VTON", n: "Garment UNet plus image-prompt adapter" },
  { y: "2024", t: "M&M VTO", n: "Several garments, layout by text" },
  { y: "2025", t: "OOTDiffusion", n: "Outfitting UNet and fusion" },
  { y: "2025", t: "CatVTON", n: "Garment and person concatenated" },
];
export function VtonTimeline({ n }: { n?: string }) {
  return (
    <Fig
      n={n}
      wide
      caption="A selection of influential papers, by year of the peer-reviewed venue. The field moved from explicit warping with GANs to diffusion models that learn the correspondence themselves."
    >
      <div className="fv-timeline">
        {[
          { cls: "fv-era--a", name: "Warp, then blend", sub: "GAN era", items: ERA_A },
          { cls: "fv-era--b", name: "Generate with attention", sub: "Diffusion era", items: ERA_B },
        ].map((era) => (
          <div key={era.name} className={`fv-era ${era.cls}`}>
            <p className="fv-era-name">
              <b>{era.name}</b>
              {era.sub}
            </p>
            <ol className="fv-era-track">
              {era.items.map((it) => (
                <li key={it.t} className="fv-era-item">
                  <span className="fv-era-year">{it.y}</span>
                  <span className="fv-era-title">{it.t}</span>
                  <span className="fv-era-note">{it.n}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Fig>
  );
}

/* ---- Which metric sees what (HTML table) ------------------------------------- */
export function MetricsMap({ n }: { n?: string }) {
  return (
    <Fig
      n={n}
      wide
      caption="Common try-on metrics by what they compare. Paired scores need a ground-truth photo, so they are measured by re-dressing a person in the garment they already wear. Unpaired scores work on new combinations but only compare whole sets of images."
    >
      <div className="fv-mmap-wrap">
        <table className="fv-mmap">
          <thead>
            <tr>
              <th />
              <th scope="col">Pixels and structure</th>
              <th scope="col">Perceptual features</th>
              <th scope="col">Whole-set statistics</th>
              <th scope="col">People</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                Paired<span>Same garment, ground truth exists</span>
              </th>
              <td data-label="Pixels and structure">
                <span className="fv-chip">SSIM</span>
                Local luminance, contrast and structure.
              </td>
              <td data-label="Perceptual features">
                <span className="fv-chip">LPIPS</span>
                <span className="fv-chip">DISTS</span>
                Deep-feature distance, calibrated to human judgement.
              </td>
              <td data-label="Whole-set statistics" className="is-empty">Not needed when a reference exists.</td>
              <td data-label="People">
                <span className="fv-chip fv-chip--p">Side-by-side</span>
                Which result is closer to the product?
              </td>
            </tr>
            <tr>
              <th scope="row">
                Unpaired<span>New garment, no ground truth</span>
              </th>
              <td data-label="Pixels and structure" className="is-empty">No reference to compare against.</td>
              <td data-label="Perceptual features">
                <span className="fv-chip">CLIP-I</span>
                Semantic similarity to the product image.
              </td>
              <td data-label="Whole-set statistics">
                <span className="fv-chip">FID</span>
                <span className="fv-chip">KID</span>
                How realistic the set looks overall.
              </td>
              <td data-label="People">
                <span className="fv-chip fv-chip--p">Preference</span>
                Realism and faithfulness, judged by people.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Fig>
  );
}
