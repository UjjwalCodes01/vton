"use client";

import CalDemoButton from "./CalDemoButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { SHOPIFY_APP_STORE_URL } from "../lib/site";

export default function StickyHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <div className={`header-wrapper ${isScrolled ? "is-scrolled" : ""}`}>
        <header className="site-header">
          <div className="site-header-shell">
            <Link className="brand" href="/" onClick={closeMenu}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fabricvton-removebg.png"
                alt="Clothsy AI / FabricVTON"
                style={{ height: "38px", width: "auto" }}
              />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="nav-links">
              <Link href="/#features">Features</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/about">About</Link>
              <Link href="/studio" className="nav-studio-link">
                Try-On Studio ✦
              </Link>
              <Link href="/demo" className="nav-demo-link">
                Live Store 🛍️
              </Link>
              <CalDemoButton className="cal-inline-trigger" label="Book a Demo" />
            </nav>

            {/* Desktop Install CTA */}
            <div className="header-desktop-actions">
              <a className="btn btn-primary" href={SHOPIFY_APP_STORE_URL}>
                Install on Shopify
              </a>
            </div>

            {/* Mobile Actions: Hamburger Toggle */}
            <div className="header-mobile-toggle-wrap">
              <Link href="/studio" className="header-mobile-quick-btn" aria-label="Try-On Studio">
                <Sparkles size={16} />
                <span>Try-On</span>
              </Link>
              <button
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Drawer Overlay & Sheet */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={closeMenu}>
          <div
            className="mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="mobile-drawer-top">
              <Link className="brand" href="/" onClick={closeMenu}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/fabricvton-removebg.png"
                  alt="Clothsy AI"
                  style={{ height: "34px", width: "auto" }}
                />
              </Link>
              <button
                className="mobile-drawer-close"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <Link href="/studio" className="mobile-drawer-link highlighted" onClick={closeMenu}>
                <div className="mobile-drawer-link-inner">
                  <span className="mobile-drawer-icon-wrap studio">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <strong>Virtual Try-On Studio</strong>
                    <p>Try clothes on real AI models or your selfie</p>
                  </div>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/demo" className="mobile-drawer-link highlighted" onClick={closeMenu}>
                <div className="mobile-drawer-link-inner">
                  <span className="mobile-drawer-icon-wrap store">
                    <ShoppingBag size={18} />
                  </span>
                  <div>
                    <strong>Interactive Demo Store</strong>
                    <p>Experience product-level try-on widget</p>
                  </div>
                </div>
                <ArrowRight size={16} />
              </Link>

              <div className="mobile-drawer-divider" />

              <Link href="/#features" className="mobile-drawer-link" onClick={closeMenu}>
                Features
              </Link>
              <Link href="/#pricing" className="mobile-drawer-link" onClick={closeMenu}>
                Pricing Plans
              </Link>
              <Link href="/#faq" className="mobile-drawer-link" onClick={closeMenu}>
                Frequently Asked Questions
              </Link>
              <Link href="/about" className="mobile-drawer-link" onClick={closeMenu}>
                About Us & Team
              </Link>
            </nav>

            <div className="mobile-drawer-footer">
              <a
                className="btn btn-primary mobile-drawer-cta"
                href={SHOPIFY_APP_STORE_URL}
                onClick={closeMenu}
              >
                Install on Shopify Free
              </a>
              <div style={{ marginTop: "12px" }}>
                <CalDemoButton className="cal-mobile-trigger" label="Book a 1-on-1 Demo Call" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
