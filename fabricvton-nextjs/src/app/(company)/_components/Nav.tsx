"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "../_lib/content";
import { Arrow } from "./Arrow";

/**
 * Solid header. The motion engine flips `data-theme` to "dark" while the header sits over the
 * graphite Evidence section, so the bar inverts instead of going translucent.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);

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

  const close = () => setOpen(false);

  return (
    <>
      <header className="fv-nav" data-theme="light">
        <div className="fv-wrap fv-nav-inner">
          <a className="fv-logo" href="#top" aria-label="FabricVTON home" onClick={close}>
            <Image
              src="/brand/lockup-horizontal.webp"
              alt="FabricVTON"
              width={900}
              height={253}
              sizes="160px"
              priority
              unoptimized
            />
          </a>

          <nav className="fv-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="fv-nav-actions">
            <a className="fv-btn fv-btn--sm" href="#collaborate">
              Contact
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
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="fv-menu-cta">
          <a className="fv-btn" href="#collaborate" onClick={close}>
            Contact <Arrow />
          </a>
        </div>
      </div>
    </>
  );
}
