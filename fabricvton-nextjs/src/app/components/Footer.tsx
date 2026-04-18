import Link from "next/link";
import React from "react";
import CalDemoButton from "./CalDemoButton";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <div className="footer-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
              </svg>
              <span>FABRICVTON</span>
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--primary)", letterSpacing: "0.1em" }}>AI TRY-ON</div>
            <p className="footer-desc">
              AI-powered virtual try-on for Shopify stores. Boost conversions and reduce returns.
            </p>
            <div className="footer-address">
              17 Rue Maurice Gignoux<br />
              38000 Grenoble<br />
              France<br />
              inigxghttt
            </div>
          </div>

          {/* Product Column */}
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href="#">Features</Link></li>
              <li><Link href="#">Pricing</Link></li>
              <li><Link href="#">Demo Store ↗</Link></li>
              <li><Link href="#">Shopify App Store ↗</Link></li>
            </ul>
          </div>

          {/* Solutions Column */}
          <div className="footer-col">
            <h4>Solutions</h4>
            <ul>
              <li><Link href="#">Fashion Brands</Link></li>
              <li><Link href="#">Shopify</Link></li>
              <li><Link href="#">Streetwear</Link></li>
              <li><Link href="#">Enterprise</Link></li>
              <li><Link href="#">PrestaShop</Link></li>
              <li><Link href="#">API</Link></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><Link href="#">Free Tools</Link></li>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Documentation</Link></li>
              <li><Link href="#">Changelog</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link href="#">About</Link></li>
              <li><Link href="#">Affiliates</Link></li>
              <li><Link href="#">Careers</Link></li>
            </ul>
          </div>

          {/* Alternatives Column */}
          <div className="footer-col">
            <h4>Alternatives</h4>
            <ul>
              <li><Link href="#">vs Antla</Link></li>
              <li><Link href="#">vs Banuba</Link></li>
              <li><Link href="#">vs MirrAR</Link></li>
              <li><Link href="#">vs Camweara</Link></li>
              <li><Link href="#">vs Looksy</Link></li>
              <li><Link href="#">vs TryPoint</Link></li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><Link href="#">Contact Us</Link></li>
              <li><CalDemoButton className="cal-inline-trigger" /></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            © 2026 FabricVTON. All rights reserved.
          </div>
          <div className="footer-legal">
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
            <button className="lang-selector">
              🇺🇸 English
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
