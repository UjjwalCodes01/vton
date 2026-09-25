import Link from "next/link";
import Image from "next/image";
import { CookieSettingsButton } from "../../_shared/CookieConsent";
import { ADDRESS, CLOTHSY_URL, CONTACT_EMAIL, CONTACT_HREF, CONTACT_MAILTO, LEGAL, RESEARCH_FORM_URL, SITE_NAME, SOCIALS } from "../_lib/site";

const ICONS: Record<string, React.ReactNode> = {
  LinkedIn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
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
            <address className="fv-footer-address">
              {ADDRESS.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
          </div>

          <nav aria-label="Research">
            <h3>Research</h3>
            <ul>
              <li>
                <Link href="/research">Research areas</Link>
              </li>
              <li>
                <Link href="/research/open-problems">Open problems</Link>
              </li>
              <li>
                <Link href="/journal">Journal</Link>
              </li>
              <li>
                <a href={RESEARCH_FORM_URL} target="_blank" rel="noopener noreferrer">
                  Join the research team
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Products">
            <h3>Products</h3>
            <ul>
              <li>
                <Link href="/products">All products</Link>
              </li>
              <li>
                <a href={CLOTHSY_URL}>Clothsy AI</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3>Company</h3>
            <ul>
              <li>
                <Link href="/company">Vision &amp; company</Link>
              </li>
              <li>
                <Link href="/careers">Careers</Link>
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
                <a href={CONTACT_MAILTO} aria-label={`Email ${CONTACT_EMAIL}`}>
                  {ICONS.Email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="fv-footer-bottom">
          <p>© {new Date().getFullYear()} FabricVTON. All rights reserved.</p>
          <p>Clothsy AI is a product by FabricVTON.</p>
          <nav className="fv-legal" aria-label="Legal">
            {LEGAL.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <CookieSettingsButton />
          </nav>
        </div>
      </div>
    </footer>
  );
}
