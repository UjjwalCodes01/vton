import Link from "next/link";
import React from "react";
import CalDemoButton from "./CalDemoButton";

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
              <li><Link href="#">About</Link></li>
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
          <div className="footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/tos">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
