import type { CSSProperties, ReactNode } from "react";
import { cssVars, delay } from "../../_lib/style";

/**
 * Animated figures for the docs. Every figure is plain HTML/SVG. Motion is CSS, started by the site's
 * reveal engine (`data-reveal` -> `.is-in`) and switched off entirely for visitors who prefer reduced
 * motion, so the finished state is always the default.
 */

function Fig({ n, caption, children, wide, tone }: { n: string; caption: ReactNode; children: ReactNode; wide?: boolean; tone?: "panel" | "dark" }) {
  return (
    <figure className={`fv-fig dx-fig${wide ? " dx-fig--wide" : ""}`} data-reveal>
      <div className={`fv-fig-frame${tone ? ` fv-fig-frame--${tone}` : ""}`}>{children}</div>
      <figcaption>
        <b>{n}</b>
        {caption}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Live try-on: one frame, from camera to screen                                                   */
/* ---------------------------------------------------------------------------------------------- */

export function LoopFigure({ n = "Figure 2" }: { n?: string }) {
  const boxes = [
    { x: 10, t: "Shopper's device", l: ["Browser camera", "Consent screen", "Session time limit", "No photo stored"] },
    { x: 237, t: "Upstream", l: ["WebRTC video", "One-time session token", "Nearest GPU region"] },
    { x: 464, t: "GPU: live try-on model", l: ["Current camera frame", "Garment memory, set once", "Its own recent frames", "Draws the next frame"], hot: true },
    { x: 691, t: "Downstream", l: ["Same person and pose", "Wearing the garment", "Streamed back", "AI-generated label"] },
  ];
  return (
    <Fig n={n} caption="One frame of live try-on, from camera to screen. The loop repeats about 30 times a second.">
      <svg viewBox="0 0 900 336" role="img" aria-label="Camera frames stream to a GPU, the model draws a new frame with the garment on, and it streams back to the screen." className="dx-loop">
        <text x="450" y="18" textAnchor="middle" className="fv-svg-label">One frame, repeated about 30 times a second</text>
        <g className="dx-pulse">
          <circle r="5.5" className="dx-pulse-dot">
            <animateMotion dur="3.2s" repeatCount="indefinite" path="M110 112 H791 V222 H110 Z" rotate="auto" />
          </circle>
        </g>
        {boxes.map((b, i) => (
          <g key={b.t} className="dx-loop-box" style={delay(i * 120)}>
            <rect x={b.x} y="44" width="200" height="136" rx="14" className={b.hot ? "dx-node dx-node--hot" : "dx-node"} />
            <text x={b.x + 100} y="76" textAnchor="middle" className="fv-svg-text dx-strong">
              {b.t}
            </text>
            {b.l.map((line, j) => (
              <text key={line} x={b.x + 100} y={102 + j * 19} textAnchor="middle" className="fv-svg-small">
                {line}
              </text>
            ))}
          </g>
        ))}
        {[210, 437, 664].map((x) => (
          <path key={x} d={`M${x} 112 H${x + 25}`} className="dx-wire" markerEnd="url(#dx-arrow)" />
        ))}
        <path id="dx-return" d="M791 180 V222 H110 V184" className="dx-wire dx-wire--return" markerEnd="url(#dx-arrow)" />
        <text x="450" y="214" textAnchor="middle" className="fv-svg-small">
          frame shown on screen; the next one is drawn about 33 ms later
        </text>
        <rect x="270" y="244" width="360" height="78" rx="12" className="dx-node dx-node--dark" />
        <text x="450" y="270" textAnchor="middle" className="fv-svg-text dx-on-dark dx-strong">
          Guardrails in the loop
        </text>
        <text x="450" y="291" textAnchor="middle" className="fv-svg-small dx-on-dark-soft">
          Age and consent check at session start
        </text>
        <text x="450" y="309" textAnchor="middle" className="fv-svg-small dx-on-dark-soft">
          Sampled output moderation, watermark and label
        </text>
        <defs>
          <marker id="dx-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1L8 5L1 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
      </svg>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* System overview: three tracks                                                                   */
/* ---------------------------------------------------------------------------------------------- */

type Node = { t: string; l: string[]; tone?: "hot" | "dark" | "plain" };

const LANES: { k: string; nodes: Node[]; note?: string }[] = [
  {
    k: "Image track",
    nodes: [
      { t: "Data sources", l: ["Licensed photoshoots", "Licensed catalogues", "Apache-2.0 teachers", "Try-off images"], tone: "plain" },
      { t: "WP2 Data engine", l: ["Pairs and triplets", "Quality filters", "Provenance ledger", "Consent records"] },
      { t: "WP3 Image model", l: ["Qwen-Image-Edit-2511", "LoRA, rank 32", "Multi-view garments", "Wear instruction"] },
      { t: "WP4 Tune and distil", l: ["Global rater panel", "Reward or judge", "4B student model", "Speed lab checks"] },
      { t: "Photo serving", l: ["Production service", "L4 and L40S GPUs", "Cost per try-on", "measured"], tone: "plain" },
    ],
    note: "The image model re-dresses video frames as a teacher, and the same distillation recipe carries over.",
  },
  {
    k: "Video and live track",
    nodes: [
      { t: "Video sources", l: ["Consented shoots", "Licensed motion", "Phone clips", "Webcam clips"], tone: "plain" },
      { t: "Video data engine", l: ["Real target clips", "Re-dressed inputs", "Temporal filters", "Human QA"] },
      { t: "WP6 Video model", l: ["Open video base", "Garment memory", "Person video in", "Offline quality first"] },
      { t: "WP7 Live model", l: ["Causal, frame by frame", "Self-forcing training", "1 to 4 steps", "KV cache"] },
      { t: "Live serving", l: ["WebRTC stream", "Own GPU servers", "15 to 20 fps target", "Cost per minute"], tone: "dark" },
    ],
    note: "The evaluation harness scores every checkpoint in both tracks.",
  },
  {
    k: "Measurement and research-output track",
    nodes: [
      { t: "WP1 Benchmark and audit", l: ["2,000+ image test pairs", "300-clip video hold-out", "8+ garment families, 5+ regions", "Skin tone and body strata"] },
      { t: "Evaluation harness", l: ["Image and video metrics", "Human ratings", "Live fps, latency, drift", "Fairness measures"], tone: "plain" },
      { t: "WP5 Outputs", l: ["Papers 1 to 4", "Open toolkit", "Benchmark release", "Own live model"], tone: "dark" },
    ],
  },
];

export function SystemFigure({ n = "Figure 1" }: { n?: string }) {
  let k = 0;
  return (
    <Fig n={n} wide caption="Proposed system overview: the image track, the video and live track, and the measurement track.">
      <div className="dx-sys">
        {LANES.map((lane) => (
          <div key={lane.k} className="dx-lane">
            <p className="dx-lane-k">{lane.k}</p>
            <div className="dx-lane-row" style={cssVars({ "--cols": lane.nodes.length })}>
              {lane.nodes.map((node) => (
                <div key={node.t} className={`dx-sysnode dx-sysnode--${node.tone ?? "hot"}`} style={delay(k++ * 70)}>
                  <b>{node.t}</b>
                  {node.l.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              ))}
              <span className="dx-lane-flow" aria-hidden="true" />
            </div>
            {lane.note ? <p className="dx-lane-note">{lane.note}</p> : null}
          </div>
        ))}
      </div>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* The cost gap between photo and live try-on                                                       */
/* ---------------------------------------------------------------------------------------------- */

export function CostFigure({ n = "Figure" }: { n?: string }) {
  const rows = [
    { k: "Photo try-on on FabricVTON's own GPU", v: 0.019, label: "USD 0.019 per garment tried", note: "measured" },
    { k: "Live try-on on a leading commercial engine", v: 1.8, label: "USD 1.80 per 90-second session", note: "list price, USD 1.20 a minute" },
    { k: "Live try-on on FabricVTON's own model", v: 0.1, label: "About USD 0.10 per 90-second session", note: "target, about USD 0.07 a minute" },
  ];
  return (
    <Fig n={n} caption="The cost of one typical use on each path. The live target is a planning estimate, not a measurement: one stream per NVIDIA H100 at about USD 4.40 an hour, fully used.">
      <div className="dx-cost">
        {rows.map((r, i) => (
          <div key={r.k} className="dx-cost-row" style={{ ...delay(i * 160), ...cssVars({ "--w": `${Math.max(1.2, (r.v / 1.8) * 100)}%` }) } as CSSProperties}>
            <p className="dx-cost-k">{r.k}</p>
            <div className="dx-cost-track">
              <span className={`dx-cost-bar${i === 1 ? " is-hot" : i === 2 ? " is-goal" : ""}`} />
            </div>
            <p className="dx-cost-v">
              <b>{r.label}</b>
              <span>{r.note}</span>
            </p>
          </div>
        ))}
      </div>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Generations of try-on architecture                                                                */
/* ---------------------------------------------------------------------------------------------- */

const ERAS = [
  { y: "2023", t: "Warp the garment, then paint", w: "TryOnDiffusion, LaDI-VTON" },
  { y: "2024", t: "Garment reference network sharing attention", w: "StableVITON, OOTDiffusion, IDM-VTON, Leffa" },
  { y: "Late 2024", t: "One network, images side by side", w: "CatVTON, TPD" },
  { y: "2025", t: "Diffusion transformer with garment tokens in context", w: "FitDiT, OmniTry, Voost, FASHN VTON 1.5" },
  { y: "2026", t: "LoRA fine-tuning of general image editors", w: "Layering VTON, TAMF-VTON, RealFit" },
  { y: "2026", t: "Fashion foundation models with reinforcement learning", w: "Tstars-Tryon, Oxygen-TryOn" },
];

export function EraFigure({ n = "Figure" }: { n?: string }) {
  return (
    <Fig n={n} caption="Six generations of virtual try-on architecture in four years. Each generation kept the best idea of the last and moved to a stronger backbone.">
      <ol className="dx-eras">
        {ERAS.map((e, i) => (
          <li key={e.t} style={delay(i * 110)}>
            <span className="dx-era-dot" aria-hidden="true" />
            <span className="dx-era-y">{e.y}</span>
            <span className="dx-era-t">{e.t}</span>
            <span className="dx-era-w">{e.w}</span>
          </li>
        ))}
      </ol>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* The four ideas behind real-time generation                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function RealtimeFigure({ n = "Figure" }: { n?: string }) {
  return (
    <Fig n={n} tone="panel" wide caption="The four published ideas that took video generation from seconds per image to a new frame every 33 to 66 milliseconds.">
      <div className="dx-ideas">
        <div className="dx-idea" style={delay(0)}>
          <div className="dx-idea-art dx-steps" aria-hidden="true">
            {Array.from({ length: 40 }, (_, i) => (
              <i key={i} className={i % 10 === 9 ? "keep" : ""} style={delay(300 + i * 18)} />
            ))}
          </div>
          <b>Fewer passes</b>
          <span>A slow teacher trains a fast student to do in 1 to 4 passes what took 20 to 50.</span>
        </div>
        <div className="dx-idea" style={delay(90)}>
          <div className="dx-idea-art dx-mem" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} style={cssVars({ "--i": i })} />
            ))}
          </div>
          <b>Memory of recent frames</b>
          <span>Each frame is drawn from the live camera frame and the model&apos;s own recent frames, kept in a key-value cache.</span>
        </div>
        <div className="dx-idea" style={delay(180)}>
          <div className="dx-idea-art dx-drift" aria-hidden="true">
            <svg viewBox="0 0 200 70">
              <path className="dx-drift-bad" d="M5 35 C 30 35, 45 30, 65 28 S 110 12, 130 22 S 170 60, 195 58" />
              <path className="dx-drift-good" d="M5 35 C 50 34, 150 36, 195 35" />
            </svg>
          </div>
          <b>Training on its own mistakes</b>
          <span>Self-forcing trains on the model&apos;s own imperfect outputs, so small errors are corrected instead of piling up.</span>
        </div>
        <div className="dx-idea" style={delay(270)}>
          <div className="dx-idea-art dx-small" aria-hidden="true">
            <i />
          </div>
          <b>Work small, engineer hard</b>
          <span>Draw a compressed image, upscale it, and run on top GPUs with custom kernels and low-precision arithmetic.</span>
        </div>
      </div>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Programme schedule (Gantt)                                                                        */
/* ---------------------------------------------------------------------------------------------- */

const GANTT: { wp: string; t: string; a: number; b: number; kind: "base" | "image" | "paper" | "video" | "live" }[] = [
  { wp: "WP0", t: "Foundations: entity, harness, protocols", a: 1, b: 1, kind: "base" },
  { wp: "WP1", t: "Pilot shoot and annotation guide", a: 2, b: 2, kind: "base" },
  { wp: "WP1", t: "Benchmark collection and annotation", a: 3, b: 5, kind: "image" },
  { wp: "WP1", t: "Baseline audit and human study", a: 4, b: 6, kind: "image" },
  { wp: "WP5", t: "Paper 1 writing and submission", a: 5, b: 7, kind: "paper" },
  { wp: "WP2", t: "Data engine and synthetic triplets", a: 3, b: 6, kind: "image" },
  { wp: "WP3", t: "LoRA training stages and ablations", a: 5, b: 8, kind: "image" },
  { wp: "WP3", t: "Multi-view conditioning experiments", a: 6, b: 8, kind: "image" },
  { wp: "WP4", t: "Preference tuning and distillation", a: 8, b: 11, kind: "image" },
  { wp: "WP5", t: "Paper 2 writing and submission", a: 9, b: 10, kind: "paper" },
  { wp: "WP4", t: "Serving integration in the product", a: 10, b: 12, kind: "image" },
  { wp: "WP6", t: "Video capture protocol and pilot shoot", a: 4, b: 6, kind: "video" },
  { wp: "WP6", t: "Video shoots and synthetic video pairs", a: 6, b: 11, kind: "video" },
  { wp: "WP6", t: "Offline video model training", a: 9, b: 13, kind: "video" },
  { wp: "WP5", t: "Paper 3 writing and submission", a: 12, b: 14, kind: "paper" },
  { wp: "WP7", t: "Causal conversion and distillation", a: 12, b: 16, kind: "live" },
  { wp: "WP7", t: "Streaming servers and live pilot", a: 14, b: 18, kind: "live" },
  { wp: "WP5", t: "Paper 4, releases and final report", a: 16, b: 18, kind: "paper" },
];

const MILESTONE_MONTHS: [string, number][] = [
  ["MS1", 1], ["MS2", 2], ["MS3", 5], ["MS4", 6], ["MS5", 6], ["MS6", 7], ["MS7", 8], ["MS8", 10],
  ["MS9", 11], ["MS10", 11], ["MS11", 12], ["MS12", 13], ["MS13", 14], ["MS14", 16], ["MS15", 18],
];

export function GanttFigure({ n = "Figure 3" }: { n?: string }) {
  const months = Array.from({ length: 18 }, (_, i) => i + 1);
  const byMonth = new Map<number, string[]>();
  MILESTONE_MONTHS.forEach(([id, m]) => byMonth.set(m, [...(byMonth.get(m) ?? []), id]));
  return (
    <Fig n={n} wide caption="Programme schedule by work package, with milestones MS1 to MS15. Month 1 is indicatively October 2026.">
      <p className="dx-scroll-hint" aria-hidden="true">
        Swipe to see all 18 months →
      </p>
      <div className="dx-gantt-scroll" tabIndex={0} role="region" aria-label="Programme schedule">
        <div className="dx-gantt">
          <div className="dx-gantt-row dx-gantt-ms">
            <span className="dx-gantt-label">Milestones</span>
            <div className="dx-gantt-lane">
              {[...byMonth.entries()].map(([m, ids], i) => (
                <span key={m} className="dx-ms" style={{ ...cssVars({ "--m": m }), ...delay(900 + i * 60) } as CSSProperties} title={ids.join(", ")}>
                  <i aria-hidden="true" />
                  <em>{ids.map((id) => id.slice(2)).join("·")}</em>
                </span>
              ))}
            </div>
          </div>
          {GANTT.map((g, i) => (
            <div key={g.t} className="dx-gantt-row">
              <span className="dx-gantt-label">
                <b>{g.wp}</b> {g.t}
              </span>
              <div className="dx-gantt-lane">
                <span
                  className={`dx-bar dx-bar--${g.kind}`}
                  style={{ ...cssVars({ "--a": g.a, "--len": g.b - g.a + 1 }), ...delay(120 + i * 45) } as CSSProperties}
                  title={`Months ${g.a} to ${g.b}`}
                />
              </div>
            </div>
          ))}
          <div className="dx-gantt-row dx-gantt-axis">
            <span className="dx-gantt-label">Programme month</span>
            <div className="dx-gantt-lane">
              {months.map((m) => (
                <span key={m} style={cssVars({ "--m": m })}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ul className="dx-legend" aria-label="Legend">
        <li><i className="dx-bar--base" /> Foundations</li>
        <li><i className="dx-bar--image" /> Image track</li>
        <li><i className="dx-bar--video" /> Video track</li>
        <li><i className="dx-bar--live" /> Live track</li>
        <li><i className="dx-bar--paper" /> Papers</li>
      </ul>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Monk Skin Tone scale                                                                              */
/* ---------------------------------------------------------------------------------------------- */

const MST = ["#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96", "#a07e56", "#825c43", "#604134", "#3a312a", "#292420"];

export function SkinScaleFigure({ n = "Figure" }: { n?: string }) {
  return (
    <Fig n={n} caption="The ten groups of the Monk Skin Tone scale, created by Dr Ellis Monk with Google. Benchmark subjects are balanced across all ten, and across body shapes including plus sizes.">
      <div className="dx-mst">
        {MST.map((c, i) => (
          <span key={c} style={{ ...cssVars({ "--c": c }), ...delay(i * 70) } as CSSProperties}>
            <i />
            <em>{i + 1}</em>
          </span>
        ))}
      </div>
    </Fig>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Two tracks, one goal (overview)                                                                   */
/* ---------------------------------------------------------------------------------------------- */

export function TracksFigure() {
  const steps = [
    { k: "Measure", t: "A licensed, consented benchmark across garment families, regions, skin tones and body shapes.", m: "Months 1 to 6" },
    { k: "Image", t: "FabricVTON's own image try-on model, tuned on human preference and distilled to serve.", m: "Months 3 to 12" },
    { k: "Video", t: "The image model re-dresses real clips to teach an offline video try-on model.", m: "Months 4 to 14" },
    { k: "Live", t: "A causal student draws every camera frame live, at 15+ fps on one GPU.", m: "Months 12 to 18" },
  ];
  return (
    <ol className="dx-tracks">
      {steps.map((s, i) => (
        <li key={s.k} data-reveal style={delay(i * 110)}>
          <span className="dx-tracks-n">{String(i + 1).padStart(2, "0")}</span>
          <b>{s.k}</b>
          <p>{s.t}</p>
          <em>{s.m}</em>
        </li>
      ))}
    </ol>
  );
}
