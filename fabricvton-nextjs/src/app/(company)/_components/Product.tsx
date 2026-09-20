import Image from "next/image";
import { TRYON_STATUS } from "../_lib/content";
import { CLOTHSY_LEARN_MORE_URL, CLOTHSY_URL } from "../_lib/site";
import { cssVars, delay } from "../_lib/style";
import { Arrow } from "./Arrow";

/**
 * Clothsy AI, presented as a product derived from FabricVTON's research. The composite on the right is
 * scroll-linked: garment enters, person appears, a scan line sweeps, the generated result resolves.
 * Imagery is the existing Clothsy demo set (garment, person, generated result).
 */
export default function Product() {
  return (
    <section className="fv-section fv-product" id="products" data-progress="through" aria-labelledby="product-title">
      <div className="fv-wrap fv-product-grid">
        <div className="fv-product-text">
          <p className="fv-eyebrow" data-reveal>
            OUR PRODUCT
          </p>
          <h2 className="fv-h2" id="product-title" data-reveal style={delay(60)}>
            Research in the real world.
          </h2>
          <p className="fv-body" data-reveal style={delay(120)}>
            Clothsy AI is our AI-powered virtual try-on product for fashion commerce, built using FabricVTON’s work in
            visual understanding, material modeling and generative vision.
          </p>
          <div className="fv-actions" data-reveal style={delay(180)}>
            <a className="fv-btn fv-btn--dark" href={CLOTHSY_URL} data-magnet>
              Visit Clothsy AI <Arrow dir="up" />
            </a>
            <a className="fv-btn fv-btn--ghost" href={CLOTHSY_LEARN_MORE_URL} data-magnet>
              Learn more <Arrow />
            </a>
          </div>
        </div>

        <div className="fv-product-lockup" data-reveal style={delay(120)}>
          <Image
            src="/brand/clothsy-powered-by.webp"
            alt="Clothsy AI, powered by FabricVTON"
            width={1000}
            height={601}
            sizes="(max-width: 719px) 80vw, 420px"
            unoptimized
          />
        </div>

        <div className="fv-product-visual">
          <div
            className="fv-tryon"
            role="img"
            aria-label="Clothsy AI turns a garment photo and a person photo into a generated try-on result"
          >
            <Image
              className="fv-tryon-person"
              src="/brand/clothsy/person.webp"
              alt=""
              width={720}
              height={995}
              sizes="(max-width: 719px) 340px, 360px"
              unoptimized
            />
            <Image
              className="fv-tryon-result"
              src="/brand/clothsy/result.webp"
              alt=""
              width={720}
              height={995}
              sizes="(max-width: 719px) 340px, 360px"
              unoptimized
            />
            <span className="fv-tryon-scan" />
            <div className="fv-tryon-rail">
              {[1, 2, 3, 4, 5].map((n, i) => (
                <Image
                  key={n}
                  className={i === 0 ? "is-active" : undefined}
                  style={cssVars({ "--i": i })}
                  src={`/brand/clothsy/garment-${n}.webp`}
                  alt=""
                  width={200}
                  height={200}
                  unoptimized
                />
              ))}
            </div>
            <div className="fv-tryon-garment">
              <Image src="/brand/clothsy/garment-flat.webp" alt="" width={480} height={639} unoptimized />
            </div>
            <div className="fv-tryon-status" aria-hidden="true">
              {TRYON_STATUS.map((s) => (
                <span key={s.label} style={cssVars({ "--a": s.a, "--b": s.b })}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
