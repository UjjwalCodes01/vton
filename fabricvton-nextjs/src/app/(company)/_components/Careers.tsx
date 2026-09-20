import { ROLES } from "../_lib/content";
import { CONTACT_HREF } from "../_lib/site";
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
                  <a href={role.href}>
                    <span>{role.title}</span>
                    {role.meta ? <span>{role.meta}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="fv-body" data-reveal style={delay(140)}>
            We’re always interested in exceptional people working at the intersection of AI, computer vision and product
            engineering.
          </p>
          <div className="fv-actions" data-reveal style={delay(200)}>
            <a className="fv-btn fv-btn--dark" href={CONTACT_HREF} data-magnet>
              Get in touch <Arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
