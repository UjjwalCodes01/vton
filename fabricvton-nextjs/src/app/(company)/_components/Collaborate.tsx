import { COLLABORATION_DOORS, COMPANY_PROBLEM_STATEMENT } from "../_lib/content";
import { CONTACT_EMAIL, isPlaceholder } from "../_lib/site";
import { delay } from "../_lib/style";

/**
 * The one place the site asks for something. It replaces the old Company, Careers and final CTA
 * sections: the problem we started with, four concrete ways to work with us, and one address.
 */
export default function Collaborate() {
  const emailIsPlaceholder = isPlaceholder(CONTACT_EMAIL);

  return (
    <section className="fv-section fv-collab" id="collaborate" aria-labelledby="collaborate-title">
      <div className="fv-wrap">
        <div data-reveal>
          <p className="fv-eyebrow">COLLABORATE</p>
          <h2 className="fv-h2" id="collaborate-title">
            Work with us.
          </h2>
          <p className="fv-lead">{COMPANY_PROBLEM_STATEMENT}</p>
        </div>

        <ul className="fv-doors" data-reveal style={delay(80)}>
          {COLLABORATION_DOORS.map((door) => (
            <li className="fv-door" key={door.title}>
              <h3>{door.title}</h3>
              <p>{door.description}</p>
            </li>
          ))}
        </ul>

        <div className="fv-contact" data-reveal style={delay(120)}>
          {emailIsPlaceholder ? (
            <span className="fv-contact-email">{CONTACT_EMAIL}</span>
          ) : (
            <a className="fv-contact-email" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          )}
          <p className="fv-contact-note">Interested in joining? Write to us at the same address.</p>
        </div>
      </div>
    </section>
  );
}
