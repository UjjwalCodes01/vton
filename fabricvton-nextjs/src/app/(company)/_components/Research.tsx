import { RESEARCH_FIELDS } from "../_lib/content";
import { delay } from "../_lib/style";
import { Slot } from "./Slot";

export default function Research() {
  return (
    <section className="fv-section fv-section--surface" id="research" aria-labelledby="research-title">
      <div className="fv-wrap">
        <div className="fv-research-head" data-reveal>
          <p className="fv-eyebrow">RESEARCH</p>
          <h2 className="fv-h2" id="research-title">
            Five problems we work on.
          </h2>
          <p className="fv-lead">
            Garments are hard for vision models: fabric moves, folds, stretches and reflects light differently on
            every body.
          </p>
        </div>

        <ul className="fv-cards">
          {RESEARCH_FIELDS.map((field, i) => (
            <li key={field.no} data-reveal style={delay(i * 60)}>
              <article className="fv-card">
                <div className="fv-card-media">
                  <Slot slot={field.image} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" />
                </div>
                <div className="fv-card-body">
                  <span className="fv-card-no">{field.no}</span>
                  <h3 className="fv-h3">{field.title}</h3>
                  <p className="fv-card-desc">{field.description}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
