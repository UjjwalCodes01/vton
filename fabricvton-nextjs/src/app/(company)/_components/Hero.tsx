import Image from "next/image";
import { cssVars } from "../_lib/style";
import { CLOTHSY_URL } from "../_lib/site";
import { Arrow } from "./Arrow";

type Tone = "cream" | "graphite";

/**
 * One fabric form of the FabricVTON mark. The two forms are separate pixel-exact layers cut from the
 * supplied logo, so they can shift independently. The mesh and node overlays are clipped to that same
 * layer's silhouette (via its own alpha), so they read as structure inside the fabric, not on top of it.
 */
function MarkLayer({ tone, kx, ky }: { tone: Tone; kx: number; ky: number }) {
  const mask = cssVars({ "--mask": `url(/brand/mark-${tone}.webp)` });
  return (
    <div className={`fv-mark-layer fv-mark-layer--${tone === "cream" ? "a" : "b"}`} style={cssVars({ "--kx": kx, "--ky": ky })}>
      <div className="fv-mark-shift">
        <Image
          src={`/brand/mark-${tone}.webp`}
          alt=""
          width={738}
          height={875}
          sizes="(max-width: 899px) 78vw, 560px"
          loading="eager"
          fetchPriority="high"
          unoptimized
        />
        <span className="fv-mesh" style={mask} />
        <span className="fv-nodes" style={mask} />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="fv-hero" id="top" data-progress="hero" aria-labelledby="hero-title">
      <div className="fv-wrap fv-hero-grid">
        <div className="fv-hero-copy">
          <p className="fv-eyebrow">
            AI RESEARCH <span className="fv-x">×</span> REAL-WORLD IMPACT
          </p>
          <h1 className="fv-h1" id="hero-title">
            Building intelligence for the <span className="fv-h1-soft">visual world.</span>
          </h1>
          <p className="fv-lead">
            FabricVTON researches and develops AI systems that understand, generate and transform visual reality —
            from people and products to materials and environments.
          </p>
          <div className="fv-actions">
            <a className="fv-btn fv-btn--dark" href="#research" data-magnet>
              Explore our research <Arrow />
            </a>
            <a className="fv-btn fv-btn--soft" href={CLOTHSY_URL} data-magnet>
              Meet Clothsy AI <Arrow dir="up" />
            </a>
          </div>
        </div>

        <div className="fv-hero-visual" data-parallax>
          <span className="fv-ring" aria-hidden="true" />
          <div className="fv-mark">
            <MarkLayer tone="cream" kx={-7} ky={-5} />
            <MarkLayer tone="graphite" kx={9} ky={6} />
          </div>
          <p className="fv-hero-caption fv-hero-caption--a" aria-hidden="true">
            Materials,
            <br />
            People,
            <br />
            Generative AI,
            <br />
            Real possibilities.
          </p>
          <p className="fv-hero-caption fv-hero-caption--b" aria-hidden="true">
            From research
            <br />
            to a more visual world.
          </p>
        </div>
      </div>

      <a className="fv-scrollcue" href="#research" aria-label="Scroll to research">
        <span>Scroll</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
