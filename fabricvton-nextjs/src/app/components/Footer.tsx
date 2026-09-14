import Link from "next/link";
import React from "react";
import CalDemoButton from "./CalDemoButton";

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
              KIET Group of Institutions<br />
              Muradnagar, Ghaziabad<br />
              Uttar Pradesh 201206, India
            </div>
            {/* Social links */}
            <div className="footer-socials">
              <a
                href="https://www.instagram.com/fabricvton/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="FabricVTON on Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://x.com/fabricvton93490"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label="FabricVTON on X (Twitter)"
              >
                <TwitterXIcon />
              </a>
              <a
                href="mailto:fabricvton@gmail.com"
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
              <li><Link href="/#pricing">Pricing</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
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
              <li><Link href="mailto:fabricvton@gmail.com">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            © {new Date().getFullYear()} FabricVTON. All rights reserved.
          </div>
          <div className="footer-bottom-right">
            <div className="footer-bottom-socials">
              <a href="https://www.instagram.com/fabricvton/" target="_blank" rel="noopener noreferrer" className="footer-bottom-social" aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href="https://x.com/fabricvton93490" target="_blank" rel="noopener noreferrer" className="footer-bottom-social" aria-label="X / Twitter">
                <TwitterXIcon />
              </a>
              <a href="mailto:fabricvton@gmail.com" className="footer-bottom-social" aria-label="Email">
                <MailIcon />
              </a>
            </div>
            <div className="footer-legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/tos">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
