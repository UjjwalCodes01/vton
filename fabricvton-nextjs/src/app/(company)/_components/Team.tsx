import { TEAM, type Founder } from "../_lib/content";
import { isPlaceholder } from "../_lib/site";
import { delay } from "../_lib/style";

/** Initials from a real name, or the slot number while the name is still a placeholder. */
function initials(member: Founder, index: number): string {
  if (isPlaceholder(member.name)) return String(index + 1).padStart(2, "0");
  return member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Team() {
  return (
    <section className="fv-section fv-section--surface" id="team" aria-labelledby="team-title">
      <div className="fv-wrap">
        <div className="fv-team-head" data-reveal>
          <p className="fv-eyebrow">TEAM</p>
          <h2 className="fv-h2" id="team-title">
            Who is building this.
          </h2>
        </div>

        <ul className="fv-team-grid">
          {TEAM.map((member, i) => (
            <li key={member.name} data-reveal style={delay(i * 50)}>
              <article className="fv-member">
                <span className="fv-member-avatar" aria-hidden="true">
                  {initials(member, i)}
                </span>
                <h3 className="fv-member-name">{member.name}</h3>
                <p className="fv-member-role">{member.role}</p>
                <p className="fv-member-bio">{member.background}</p>
                {isPlaceholder(member.linkedin) ? (
                  <span className="fv-member-link" aria-disabled="true">
                    {member.linkedin}
                  </span>
                ) : (
                  <a className="fv-member-link" href={member.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
