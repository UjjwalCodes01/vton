import { CONTACT_HREF } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

export default function FinalCta() {
  return (
    <section className="fv-cta" aria-labelledby="cta-title">
      <div className="fv-wrap">
        <p className="fv-eyebrow" data-reveal>
          LET’S BUILD A MORE VISUAL WORLD
        </p>
        <h2 className="fv-h2" id="cta-title" data-reveal style={delay(60)}>
          Research. Product. People.
        </h2>
        <p className="fv-lead" data-reveal style={delay(110)}>
          Join us in shaping the next generation of visual intelligence.
        </p>
        <div className="fv-actions" data-reveal style={delay(160)}>
          <a className="fv-btn fv-btn--dark" href={CONTACT_HREF} data-magnet>
            Talk to us <Arrow />
          </a>
          <a className="fv-btn fv-btn--soft" href="#careers" data-magnet>
            Explore careers
          </a>
        </div>
      </div>
    </section>
  );
}
