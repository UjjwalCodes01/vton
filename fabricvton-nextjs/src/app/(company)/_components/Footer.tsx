import Image from "next/image";
import { CLOTHSY_URL, CONTACT_EMAIL, CONTACT_HREF, SITE_NAME, SOCIALS } from "../_lib/site";

const ICONS: Record<string, React.ReactNode> = {
  X: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Instagram: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  Email: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

export default function Footer() {
  return (
    <footer className="fv-footer">
      <div className="fv-wrap">
        <div className="fv-footer-grid">
          <div className="fv-footer-brand">
            <Image
              src="/brand/lockup-horizontal.webp"
              alt={SITE_NAME}
              width={900}
              height={253}
              sizes="160px"
              loading="lazy"
              unoptimized
            />
            <p>AI research and technology company building intelligence for the visual world.</p>
          </div>

          <nav aria-label="Research">
            <h3>Research</h3>
            <ul>
              <li>
                <a href="#research">Research areas</a>
              </li>
              <li>
                <a href="#journal">Journal</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Products">
            <h3>Products</h3>
            <ul>
              <li>
                <a href={CLOTHSY_URL}>Clothsy AI</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3>Company</h3>
            <ul>
              <li>
                <a href="#company">About</a>
              </li>
              <li>
                <a href="#careers">Careers</a>
              </li>
              <li>
                <a href={CONTACT_HREF}>Contact</a>
              </li>
            </ul>
          </nav>

          <div>
            <h3>Connect</h3>
            <ul className="fv-social">
              {SOCIALS.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${SITE_NAME} on ${s.name}`}>
                    {ICONS[s.name]}
                  </a>
                </li>
              ))}
              <li>
                <a href={CONTACT_HREF} aria-label={`Email ${CONTACT_EMAIL}`}>
                  {ICONS.Email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="fv-footer-bottom">
          <p>© {new Date().getFullYear()} FabricVTON. All rights reserved.</p>
          <p>Clothsy AI is a product by FabricVTON.</p>
        </div>
      </div>
    </footer>
  );
}
