import Link from "next/link";
import Image from "next/image";
import { OPEN_PROBLEMS, RESEARCH_FIELDS } from "../_lib/content";
import { RESEARCH_FORM_URL } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

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
          <div data-reveal style={delay(80)}>
            <p className="fv-lead">
              From fabric and humans to objects and environments, we build models that see deeper, understand better and
              generate with greater control.
            </p>
            <Link className="fv-textlink" href="/research" data-magnet>
              Explore research <Arrow />
            </Link>
          </div>
        </div>

        <ul className="fv-fields">
          {RESEARCH_FIELDS.map((field, i) => (
            <li key={field.no} data-reveal style={delay(i * 80)}>
              <a className="fv-field" href={`/research/${field.slug}`} data-magnet aria-label={`${field.title}: ${field.description}`}>
                <span className="fv-field-media">
                  <Image
                    src={field.image.src}
                    alt=""
                    width={field.image.width}
                    height={field.image.height}
                    sizes="(max-width: 599px) 100vw, (max-width: 1099px) 50vw, 290px"
                    unoptimized
                  />
                </span>
                <span className="fv-field-body">
                  <span className="fv-field-no">{field.no}</span>
                  <span className="fv-field-title">{field.title}</span>
                  <span className="fv-field-desc">{field.description}</span>
                  <span className="fv-field-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="fv-problems" id="open-problems">
          <div className="fv-problems-head" data-reveal>
            <p className="fv-eyebrow">OPEN PROBLEMS</p>
            <h3 className="fv-h3">What we’re working on now</h3>
            <p className="fv-body">
              These problems are hard and unsolved. We treat them as research, with experiments, ablations and
              benchmarks, and the results ship in production.
            </p>
            <Link className="fv-textlink" href="/research/open-problems" data-magnet>
              Read about the open problems <Arrow />
            </Link>
            <a className="fv-textlink" href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer" data-magnet>
              Work on these with us <Arrow dir="up" />
            </a>
          </div>
          <ol className="fv-problems-list">
            {OPEN_PROBLEMS.map((problem, i) => (
              <li key={problem.title} data-reveal style={delay(i * 70)}>
                <span className="fv-problem-no">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="fv-problem-title">{problem.title}</span>
                  <span className="fv-problem-text">{problem.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
