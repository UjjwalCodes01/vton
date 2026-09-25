import Link from "next/link";
import Image from "next/image";
import { TRYON_STATUS } from "../_lib/content";
import { CLOTHSY_URL } from "../_lib/site";
import { cssVars, delay } from "../_lib/style";
import { Arrow } from "./Arrow";
import ProductHuntCard from "./ProductHuntCard";

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
            Research
            <br />
            in the real world.
          </h2>
          <p className="fv-body" data-reveal style={delay(120)}>
            Clothsy AI is our first product — an AI-powered virtual try-on platform for fashion commerce, built on top
            of FabricVTON’s research in visual understanding, material modeling and generative AI.
          </p>
          <div className="fv-actions" data-reveal style={delay(180)}>
            <a className="fv-btn fv-btn--dark" href={CLOTHSY_URL} data-magnet>
              Visit Clothsy AI <Arrow dir="up" />
            </a>
            <Link className="fv-btn fv-btn--soft" href="/products" data-magnet>
              Learn more
            </Link>
          </div>
          <div data-reveal style={delay(220)}>
            <ProductHuntCard />
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

          {/* Handwritten margin notes, as in the design. Decorative. */}
          <p className="fv-hand fv-hand--a" aria-hidden="true">
            Try on
            <br />
            any outfit
            <br />
            anywhere.
          </p>
          <p className="fv-hand fv-hand--b" aria-hidden="true">
            Fashion
            <br />
            without limits.
          </p>
          <svg className="fv-hand-arrow" viewBox="0 0 64 44" aria-hidden="true" focusable="false">
            <path d="M62 38 C 44 40, 22 34, 6 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M5 20 L5 9 L15 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
