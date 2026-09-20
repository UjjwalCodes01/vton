import { CLOTHSY_DEMO } from "../_lib/content";
import { CLOTHSY_URL } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";
import { Slot } from "./Slot";

/**
 * Clothsy AI: the product the research turns into. The demo shows all three real pieces —
 * the person's photo, the garment as listed, and the model's own output. Nothing is simulated.
 */
export default function Clothsy() {
  return (
    <section className="fv-section" id="clothsy" aria-labelledby="clothsy-title">
      <div className="fv-wrap fv-clothsy-grid">
        <div className="fv-clothsy-text">
          <p className="fv-eyebrow" data-reveal>
            PRODUCT
          </p>
          <h2 className="fv-h2" id="clothsy-title" data-reveal style={delay(60)}>
            Clothsy AI
          </h2>
          <p className="fv-body" data-reveal style={delay(100)}>
            Our virtual try-on product for fashion stores. A shopper uploads one photo and sees the garment on
            themselves, with its print and drape intact.
          </p>
          <p className="fv-body" data-reveal style={delay(140)}>
            It runs on the research above, and it is where we test whether that research holds up outside a
            benchmark.
          </p>
          <div data-reveal style={delay(180)}>
            <a className="fv-btn" href={CLOTHSY_URL}>
              Visit Clothsy AI <Arrow dir="up" />
            </a>
          </div>
        </div>

        <div className="fv-tryon" data-reveal style={delay(120)}>
          <div className="fv-tryon-inputs">
            <div>
              <div className="fv-tryon-frame fv-tryon-frame--person">
                <Slot slot={CLOTHSY_DEMO.person} sizes="(max-width: 899px) 40vw, 220px" />
              </div>
              <span className="fv-tryon-label">Person</span>
            </div>
            <div>
              <div className="fv-tryon-frame fv-tryon-frame--garment">
                <Slot slot={CLOTHSY_DEMO.garment} sizes="(max-width: 899px) 40vw, 220px" />
              </div>
              <span className="fv-tryon-label">Garment</span>
            </div>
          </div>

          <div className="fv-tryon-op" aria-hidden="true">
            →
          </div>

          <div>
            <div className="fv-tryon-frame fv-tryon-frame--result">
              <Slot slot={CLOTHSY_DEMO.result} sizes="(max-width: 899px) 60vw, 320px" />
            </div>
            <span className="fv-tryon-label">Generated result</span>
          </div>
        </div>
      </div>
    </section>
  );
}
