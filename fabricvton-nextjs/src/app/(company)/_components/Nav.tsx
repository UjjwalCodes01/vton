"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "../_lib/content";
import { CLOTHSY_URL, CONTACT_HREF } from "../_lib/site";
import { Arrow } from "./Arrow";

/**
 * Transparent over the page header; the motion engine flips `data-scrolled` to get the frosted bar.
 * "Products" opens a small dropdown (click, or hover on a fine pointer). On phones the full-screen menu lists
 * the product inline under its heading.
 */
function ProductCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <a className="fv-drop-card" href={CLOTHSY_URL} onClick={onNavigate}>
      <Image className="fv-drop-mark" src="/brand/clothsy/clothsy-mark.webp" alt="" width={48} height={48} unoptimized />
      <span className="fv-drop-card-body">
        <span className="fv-drop-card-title">
          Clothsy AI <Arrow dir="up" />
        </span>
        <span className="fv-drop-card-text">Virtual try-on for fashion stores. On Shopify and WooCommerce.</span>
      </span>
    </a>
  );
}

export default function Nav({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("fv-lock");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("fv-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!drop) return;
    const onDown = (e: PointerEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setDrop(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrop(false);
        dropRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [drop]);

  const close = () => setOpen(false);
  const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hoverOpen = () => {
    if (!fine()) return;
    window.clearTimeout(hoverTimer.current);
    setDrop(true);
  };
  const hoverClose = () => {
    if (!fine()) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setDrop(false), 180);
  };

  return (
    <>
      <header className="fv-nav" data-scrolled="false">
        <div className="fv-wrap fv-nav-inner">
          <Link className="fv-logo" href="/" aria-label="FabricVTON home" onClick={close}>
            <Image
              src="/brand/lockup-horizontal.webp"
              alt="FabricVTON"
              width={900}
              height={253}
              loading="eager"
              fetchPriority="high"
              unoptimized
            />
          </Link>

          <nav className="fv-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) =>
              link.label === "Products" ? (
                <div
                  key={link.href}
                  className="fv-drop"
                  ref={dropRef}
                  data-open={drop}
                  onPointerEnter={hoverOpen}
                  onPointerLeave={hoverClose}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(false);
                  }}
                >
                  <button
                    type="button"
                    className="fv-drop-btn"
                    aria-expanded={drop}
                    aria-controls="fv-drop-panel"
                    aria-current={current === link.href ? "page" : undefined}
                    onClick={() => setDrop((d) => !d)}
                  >
                    Products
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="fv-drop-panel" id="fv-drop-panel" inert={!drop}>
                    <p className="fv-drop-label">Our products</p>
                    <ProductCard onNavigate={() => setDrop(false)} />
                    <Link className="fv-drop-more" href="/products" onClick={() => setDrop(false)}>
                      How research becomes product <Arrow />
                    </Link>
                  </div>
                </div>
              ) : (
                <a key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined}>
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="fv-nav-actions">
            <a className="fv-btn fv-btn--soft fv-btn--sm" href={CLOTHSY_URL} data-magnet>
              Clothsy AI <Arrow dir="up" />
            </a>
            <a className="fv-btn fv-btn--dark fv-btn--sm" href={CONTACT_HREF}>
              Talk to us
            </a>
            <button
              className="fv-burger"
              type="button"
              aria-expanded={open}
              aria-controls="fv-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className="fv-menu" id="fv-menu" data-open={open} inert={!open}>
        <nav aria-label="Mobile">
          {NAV_LINKS.map((link) =>
            link.label === "Products" ? (
              <div key={link.href} className="fv-menu-group">
                <a href={link.href} onClick={close}>
                  Products
                </a>
                <ProductCard onNavigate={close} />
              </div>
            ) : (
              <a key={link.href} href={link.href} onClick={close}>
                {link.label}
              </a>
            ),
          )}
        </nav>
        <div className="fv-menu-cta">
          <a className="fv-btn fv-btn--soft" href={CLOTHSY_URL} onClick={close}>
            Clothsy AI <Arrow dir="up" />
          </a>
          <a className="fv-btn fv-btn--dark" href={CONTACT_HREF} onClick={close}>
            Talk to us
          </a>
        </div>
      </div>
    </>
  );
}
