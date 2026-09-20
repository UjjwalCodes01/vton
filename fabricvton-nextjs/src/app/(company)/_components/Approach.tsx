import { PIPELINE } from "../_lib/content";
import { cssVars } from "../_lib/style";

/**
 * "More than pixels": a scroll-linked pipeline (Input, Geometry, Material, Model, Output).
 *
 * The five illustrations are one garment silhouette drawn five ways. Only the fabric texture and the
 * FabricVTON mark are supplied art; the mesh, loupe and lattice are illustrative diagrams of the idea,
 * not outputs of a real model, and the section says so. Swap the SVGs for real intermediates
 * (segmentation, geometry, texture maps) when they exist.
 */

const TEE =
  "M50 16 L64 10 C72 24 88 24 96 10 L110 16 L146 38 L131 68 L114 58 L114 174 L46 174 L46 58 L29 68 L14 38 Z";

/** Shared clip paths, patterns and gradients, referenced by id from every stage. */
function PipelineDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="fv-tee">
          <path d={TEE} />
        </clipPath>
        <clipPath id="fv-loupe">
          <circle cx="96" cy="112" r="30" />
        </clipPath>
        <pattern id="fv-grid" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
          <path d="M0 0H9M0 0V9" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.6} fill="none" />
        </pattern>
        <pattern id="fv-dots" width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="6.5" cy="6.5" r="1.3" fill="#b7a2ff" />
        </pattern>
        <linearGradient id="fv-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.18} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.26} />
        </linearGradient>
        <radialGradient id="fv-ground">
          <stop offset="0" stopColor="#000" stopOpacity={0.5} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
      </defs>
    </svg>
  );
}

function Art({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg className="fv-art" viewBox="0 0 160 190" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

const ART = [
  // 1. Input: a flat garment image
  <Art key="input" label="A flat garment photo (illustrative)">
    <ellipse cx="80" cy="180" rx="44" ry="5" fill="url(#fv-ground)" opacity={0.5} />
    <g clipPath="url(#fv-tee)">
      <image href="/brand/fabric-cream-1.webp" x="-6" y="0" width="172" height="190" preserveAspectRatio="xMidYMid slice" />
      <rect width="160" height="190" fill="url(#fv-shade)" />
    </g>
  </Art>,

  // 2. Geometry: the same garment as a surface mesh
  <Art key="geometry" label="The same garment as a surface mesh (illustrative)">
    <g clipPath="url(#fv-tee)">
      <rect width="160" height="190" fill="#fff" fillOpacity={0.04} />
      <rect width="160" height="190" fill="url(#fv-grid)" />
      <path d="M30 70 C60 86 100 86 130 70" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} />
      <path d="M46 110 C70 122 92 122 114 106" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} />
    </g>
    <path d={TEE} fill="none" stroke="#fff" strokeOpacity={0.6} />
  </Art>,

  // 3. Material: a magnified look at the weave
  <Art key="material" label="A magnified view of fabric weave (illustrative)">
    <g clipPath="url(#fv-tee)" opacity={0.5}>
      <image href="/brand/fabric-cream-1.webp" x="-6" y="0" width="172" height="190" preserveAspectRatio="xMidYMid slice" />
    </g>
    <path d={TEE} fill="none" stroke="#fff" strokeOpacity={0.25} />
    <circle cx="96" cy="112" r="30" fill="#252932" />
    <g clipPath="url(#fv-loupe)">
      <image href="/brand/fabric-cream-2.webp" x="-34" y="32" width="260" height="159" preserveAspectRatio="xMidYMid slice" />
    </g>
    <circle cx="96" cy="112" r="30" fill="none" stroke="#a58bff" strokeWidth={1.5} />
  </Art>,

  // 4. Model: the FabricVTON mark at the centre of a lattice
  <Art key="model" label="The FabricVTON model at the centre of a lattice (illustrative)">
    <g clipPath="url(#fv-tee)">
      <rect width="160" height="190" fill="url(#fv-dots)" />
      <rect width="160" height="190" fill="url(#fv-grid)" opacity={0.5} />
    </g>
    <path d={TEE} fill="none" stroke="#a58bff" strokeOpacity={0.55} />
    <circle cx="80" cy="104" r="27" fill="#1c1f26" stroke="#a58bff" strokeOpacity={0.7} />
    <image href="/brand/mark-merged.webp" x="62" y="82.7" width="36" height="42.7" />
  </Art>,

  // 5. Output: the finished, shaded garment
  <Art key="output" label="The finished garment render (illustrative)">
    <ellipse cx="80" cy="180" rx="44" ry="5" fill="url(#fv-ground)" opacity={0.7} />
    <g clipPath="url(#fv-tee)">
      <image href="/brand/fabric-cream-2.webp" x="-40" y="-10" width="240" height="200" preserveAspectRatio="xMidYMid slice" />
      <rect width="160" height="190" fill="url(#fv-shade)" />
      <path d="M46 96 C66 110 92 108 114 92" fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2} />
      <path d="M46 134 C70 146 94 144 114 130" fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2} />
    </g>
  </Art>,
];

export default function Approach() {
  return (
    <section className="fv-approach fv-dark" id="approach" data-progress="pin" aria-labelledby="approach-title">
      <PipelineDefs />
      <div className="fv-approach-stage">
        <div className="fv-wrap">
          <header className="fv-approach-head">
            <div>
              <p className="fv-eyebrow">OUR APPROACH</p>
              <h2 className="fv-h2" id="approach-title">
                More than pixels.
                <br />
                A deeper understanding.
              </h2>
            </div>
            <p className="fv-lead">
              We combine computer vision, generative models and physical understanding to build AI that respects the
              real world — its materials, geometry and complexity.
            </p>
          </header>

          <div className="fv-pipe">
            <ol className="fv-pipe-list">
              {PIPELINE.map((stage, i) => (
                <li key={stage.label} className="fv-stage" data-reveal style={cssVars({ "--a": stage.from })}>
                  <div className="fv-stage-head">
                    <span className="fv-stage-label">{stage.label}</span>
                    <span className="fv-stage-name">{stage.name}</span>
                  </div>
                  {ART[i]}
                </li>
              ))}
            </ol>
            <div className="fv-pipe-rail" aria-hidden="true">
              <span className="fv-pipe-fill" />
              <span className="fv-pipe-dot" />
            </div>
          </div>

          <div className="fv-approach-aside" aria-hidden="true">
            <p>
              People
              <br />
              Products
              <br />
              Materials
              <br />
              Environments
            </p>
            <p>
              Same garment.
              <br />
              New possibilities.
            </p>
          </div>
          <p className="fv-pipe-note">Illustrative pipeline.</p>
        </div>
      </div>
    </section>
  );
}
