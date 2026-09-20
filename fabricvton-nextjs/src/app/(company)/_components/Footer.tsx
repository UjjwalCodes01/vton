import Image from "next/image";
import { CLOTHSY_URL, COMPANY_ADDRESS, SITE_NAME, SITE_TAGLINE, SOCIALS, isPlaceholder } from "../_lib/site";

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
            <p>{SITE_TAGLINE}</p>
          </div>

          <nav aria-label="Research">
            <h3>Research</h3>
            <ul>
              <li>
                <a href="#research">Research areas</a>
              </li>
              <li>
                <a href="#evidence">Evidence</a>
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
                <a href="#team">Team</a>
              </li>
              <li>
                <a href="#collaborate">Contact</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Connect">
            <h3>Connect</h3>
            <ul>
              {SOCIALS.map((social) =>
                isPlaceholder(social.href) ? (
                  <li key={social.name}>
                    <span>{social.href}</span>
                  </li>
                ) : (
                  <li key={social.name}>
                    <a href={social.href} target="_blank" rel="noopener noreferrer">
                      {social.name}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <div className="fv-footer-bottom">
          <p>© {new Date().getFullYear()} FabricVTON</p>
          <nav aria-label="Legal">
            <a href="/privacy">Privacy</a>
            <a href="/tos">Terms</a>
          </nav>
          <p>{COMPANY_ADDRESS}</p>
        </div>
      </div>
    </footer>
  );
}
