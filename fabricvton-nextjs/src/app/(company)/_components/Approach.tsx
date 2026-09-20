import Image from "next/image";
import { PIPELINE } from "../_lib/content";
import { cssVars } from "../_lib/style";
import { Arrow } from "./Arrow";

/**
 * "More than pixels": a compact banner walking one garment through Input, Geometry, Material, Model
 * and Output. As the banner scrolls into view the stages appear left to right (a single `--p` value
 * from the motion engine; nothing loops, and reduced motion shows all five at once).
 *
 * The renders are illustrations of the idea, not outputs of a running model, and the section says so.
 * Images use `mix-blend-mode: lighten` so their own dark surroundings dissolve into the backdrop.
 * The reveal therefore lives on the images and labels, never on a wrapper: a wrapper with opacity or
 * transform would isolate the blend from the backdrop.
 */
export default function Approach() {
  return (
    <section className="fv-approach fv-dark" id="approach" data-progress="through" aria-labelledby="approach-title">
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
          <div>
            <p className="fv-lead">
              We combine computer vision, generative models and physical understanding to build AI that respects the
              real world — its materials, geometry and complexity.
            </p>
            <a className="fv-textlink" href="#research" data-magnet>
              Our approach <Arrow />
            </a>
          </div>
        </header>

        <ol className="fv-pipe-list">
          {PIPELINE.map((stage) => (
            <li key={stage.label} className="fv-stage" style={cssVars({ "--a": stage.from })}>
              <div className="fv-stage-head">
                <span className="fv-stage-label">{stage.label}</span>
                <span className="fv-stage-name">{stage.name}</span>
              </div>
              <div className="fv-stage-art">
                <Image
                  className="fv-garment"
                  src={stage.image.src}
                  alt={`${stage.label}: ${stage.name} (illustration)`}
                  width={stage.image.width}
                  height={stage.image.height}
                  sizes="(max-width: 899px) 60vw, 210px"
                  unoptimized
                />
              </div>
            </li>
          ))}
        </ol>
        <p className="fv-pipe-note">Illustrative pipeline.</p>
      </div>
    </section>
  );
}
