import Image from "next/image";
import { RESEARCH_FIELDS } from "../_lib/content";
import { delay } from "../_lib/style";

export default function Research() {
  return (
    <section className="fv-section fv-research" id="research" aria-labelledby="research-title">
      <div className="fv-wrap">
        <div className="fv-split">
          <div data-reveal>
            <p className="fv-eyebrow">OUR RESEARCH</p>
            <h2 className="fv-h2" id="research-title">
              We work on problems where vision meets reality.
            </h2>
          </div>
          <p className="fv-lead" data-reveal style={delay(80)}>
            We build models and systems that help machines see deeper — understanding people, objects, materials and
            the environments they exist in.
          </p>
        </div>

        <ul className="fv-fields">
          {RESEARCH_FIELDS.map((field, i) => (
            <li key={field.no} data-reveal style={delay(i * 80)}>
              <a className="fv-field" href={field.href} data-magnet>
                <span className="fv-field-media">
                  <Image
                    src={field.image.src}
                    alt=""
                    width={field.image.width}
                    height={field.image.height}
                    sizes="(max-width: 599px) 100vw, (max-width: 1099px) 50vw, 300px"
                    unoptimized
                  />
                </span>
                <span className="fv-field-body">
                  <span className="fv-field-no">{field.no}</span>
                  <span className="fv-field-title">{field.title}</span>
                  <span className="fv-field-desc">{field.description}</span>
                </span>
                <span className="fv-field-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
