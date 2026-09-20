import { CONTACT_HREF } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

export default function FinalCta() {
  return (
    <section className="fv-cta" aria-labelledby="cta-title">
      <div className="fv-wrap">
        <h2 className="fv-h2" id="cta-title" data-reveal>
          Research. Product. People.
        </h2>
        <p className="fv-lead" data-reveal style={delay(80)}>
          Building the next generation of visual intelligence takes all three.
        </p>
        <div className="fv-actions" data-reveal style={delay(140)}>
          <a className="fv-btn fv-btn--dark" href={CONTACT_HREF} data-magnet>
            Talk to us <Arrow />
          </a>
          <a className="fv-btn fv-btn--ghost" href="#research" data-magnet>
            Explore our research <Arrow />
          </a>
        </div>
      </div>
    </section>
  );
}
