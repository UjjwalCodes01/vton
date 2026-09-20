import Image from "next/image";
import { CLOTHSY_URL, CONTACT_HREF, SITE_NAME, SITE_TAGLINE, SOCIALS } from "../_lib/site";

export default function Footer() {
  return (
    <footer className="fv-footer">
      <div className="fv-wrap">
        <div className="fv-footer-grid">
          <div className="fv-footer-brand">
            <Image src="/brand/lockup-horizontal.webp" alt={SITE_NAME} width={900} height={253} sizes="160px" unoptimized />
            <p>{SITE_TAGLINE}</p>
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

          <nav aria-label="Connect">
            <h3>Connect</h3>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="fv-footer-bottom">
          <p>© {new Date().getFullYear()} FabricVTON. All rights reserved.</p>
          <p>Clothsy AI is a product by FabricVTON.</p>
        </div>
      </div>
    </footer>
  );
}
