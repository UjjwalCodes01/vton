"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "../_lib/content";
import { CLOTHSY_URL, CONTACT_HREF } from "../_lib/site";
import { Arrow } from "./Arrow";

/**
 * Transparent over the hero; the motion engine flips `data-scrolled` to get the frosted bar.
 * The only state here is the mobile menu.
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
      <header className="fv-nav" data-scrolled="false">
        <div className="fv-wrap fv-nav-inner">
          <a className="fv-logo" href="#top" aria-label="FabricVTON home" onClick={close}>
            <Image
              src="/brand/lockup-horizontal.webp"
              alt="FabricVTON"
              width={900}
              height={253}
              loading="eager"
              fetchPriority="high"
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
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
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
