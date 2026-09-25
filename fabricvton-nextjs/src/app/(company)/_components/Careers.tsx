import { ROLES } from "../_lib/content";
import { CONTACT_HREF, RESEARCH_FORM_URL } from "../_lib/site";
import { delay } from "../_lib/style";
import { Arrow } from "./Arrow";

export default function Careers() {
  return (
    <section className="fv-section fv-careers" id="careers" aria-labelledby="careers-title">
      <div className="fv-wrap fv-careers-grid">
        <div data-reveal>
          <p className="fv-eyebrow">CAREERS</p>
          <h2 className="fv-h2" id="careers-title">
            Work on problems that don’t have clean answers.
          </h2>
        </div>

        <div className="fv-careers-copy">
          <p className="fv-lead" data-reveal style={delay(80)}>
            We are building systems for visual AI where texture, geometry, identity, realism and efficiency all matter
            at once.
          </p>

          {ROLES.length > 0 ? (
            <ul className="fv-roles" data-reveal style={delay(120)}>
              {ROLES.map((role) => (
                <li key={role.title}>
                  <a
                    href={role.href}
                    {...(role.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <span>{role.title}</span>
                    {role.meta ? <span>{role.meta}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="fv-body" data-reveal style={delay(140)}>
            We’re building a virtual try-on research team of students, researchers and engineers. The work is real
            research, and it ships in production. The application takes about two minutes.
          </p>
          <div className="fv-actions" data-reveal style={delay(200)}>
            <a className="fv-btn fv-btn--dark" href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer" data-magnet>
              Apply to the research team <Arrow dir="up" />
            </a>
            <a className="fv-btn fv-btn--soft" href={CONTACT_HREF} data-magnet>
              Get in touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
