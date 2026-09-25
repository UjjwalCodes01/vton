import Link from "next/link";
import React from "react";
import CalDemoButton from "./CalDemoButton";
import { CLOTHSY_HOME } from "../lib/site";
import { CookieSettingsButton } from "../../_shared/CookieConsent";

/* Social icon SVGs — self-contained so no extra library needed */
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TwitterXIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
              </svg>
              <span>FABRICVTON</span>
            </div>
            <p className="footer-desc">
              AI-powered virtual try-on for Shopify stores. Boost conversions, cut returns.
            </p>
            <div className="footer-address">
              Near Shiv Mandir, Kendua Bazar Hatia Patti<br />
              Kenduadih, Dhanbad<br />
              Jharkhand 828116, India
            </div>
            {/* Social links */}
            <div className="footer-socials">
              <a
                href="https://www.instagram.com/clothsyai/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="Clothsy AI on Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://x.com/clothsyai"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="Clothsy AI on X"
              >
                <TwitterXIcon />
              </a>
              <a
                href="https://www.linkedin.com/company/clothsy/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="Clothsy AI on LinkedIn"
              >
                <LinkedInIcon />
              </a>
              <a
                href="mailto:contact@fabricvton.com"
                className="footer-social-link"
                aria-label="Email FabricVTON"
              >
                <MailIcon />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href={`${CLOTHSY_HOME}#pricing`}>Pricing</Link></li>
              <li><Link href={`${CLOTHSY_HOME}#faq`}>FAQ</Link></li>
              <li><CalDemoButton className="cal-inline-trigger" label="Book a Demo" /></li>
            </ul>
          </div>

          {/* Solutions */}
          <div className="footer-col">
            <h4>Solutions</h4>
            <ul>
              <li><Link href="#">Shopify Stores</Link></li>
              <li><Link href="#">D2C Fashion Brands</Link></li>
              <li><Link href="#">Streetwear</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/privacy">Merchant Privacy</Link></li>
              <li><Link href="/widget-privacy">Shopper Privacy</Link></li>
              <li><Link href="mailto:contact@fabricvton.com">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            © {new Date().getFullYear()} FabricVTON. All rights reserved.
          </div>
          <div className="footer-bottom-right">
            <div className="footer-bottom-socials">
              <a href="https://www.instagram.com/clothsyai/" target="_blank" rel="noopener noreferrer" className="footer-bottom-social" aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href="https://x.com/clothsyai" target="_blank" rel="noopener noreferrer" className="footer-bottom-social" aria-label="X / Twitter">
                <TwitterXIcon />
              </a>
              <a href="https://www.linkedin.com/company/clothsy/" target="_blank" rel="noopener noreferrer" className="footer-bottom-social" aria-label="LinkedIn">
                <LinkedInIcon />
              </a>
              <a href="mailto:contact@fabricvton.com" className="footer-bottom-social" aria-label="Email">
                <MailIcon />
              </a>
            </div>
            <div className="footer-legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/tos">Terms</Link>
              <CookieSettingsButton className="footer-cookie-btn" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
