import Image from "next/image";
import { cssVars } from "../_lib/style";
import { Arrow } from "./Arrow";

/**
 * One fabric form of the FabricVTON mark. The two forms are separate pixel-exact layers cut from
 * the supplied logo, so they can drift independently under the cursor.
 */
function MarkLayer({ tone, kx, ky }: { tone: "cream" | "graphite"; kx: number; ky: number }) {
  return (
    <div
      className={`fv-mark-layer fv-mark-layer--${tone === "cream" ? "a" : "b"}`}
      style={cssVars({ "--kx": kx, "--ky": ky })}
    >
      <div className="fv-mark-shift">
        <Image
          src={`/brand/mark-${tone}.webp`}
          alt=""
          width={738}
          height={875}
          sizes="(max-width: 899px) 82vw, 520px"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="fv-hero" id="top" data-progress="hero" aria-labelledby="hero-title">
      <div className="fv-wrap fv-hero-grid">
        <div className="fv-hero-copy">
          <p className="fv-eyebrow">AI RESEARCH</p>
          <h1 className="fv-h1" id="hero-title">
            AI that understands fabric.
          </h1>
          <p className="fv-lead">
            FabricVTON researches how fabric drapes, stretches and holds its detail — and builds visual AI that
            gets it right.
          </p>
          <div className="fv-hero-actions">
            <a className="fv-btn" href="#research">
              Explore our research
            </a>
            <a className="fv-link" href="#collaborate">
              Work with us <Arrow />
            </a>
          </div>
        </div>

        <div className="fv-hero-visual" data-parallax>
          <div className="fv-mark">
            <MarkLayer tone="cream" kx={-6} ky={-4} />
            <MarkLayer tone="graphite" kx={8} ky={5} />
          </div>
        </div>
      </div>
    </section>
  );
}
