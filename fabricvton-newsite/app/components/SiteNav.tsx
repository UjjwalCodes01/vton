"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "./icons";
import { SHOPIFY_URL, WOO_URL } from "../lib/site";

const links = [
  { href: "/#how", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/#about", label: "About" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="shell">
        <div className="nav-inner">
          <Link className="brand" href="/" aria-label="Clothsy AI home">
            <Image className="brand-mark" src="/clothsy-mark.png" alt="" width={72} height={72} priority />
            <Image className="brand-word" src="/clothsy-wordmark.png" alt="" width={600} height={149} priority />
          </Link>

          <nav className="nav-links" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="nav-actions">
            <a className="btn btn-dark btn-sm nav-install" href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer">
              Install on Shopify <ArrowUpRight className="btn-arrow" />
            </a>
            <a className="btn btn-ghost btn-sm nav-install" href={WOO_URL} target="_blank" rel="noopener noreferrer">
              Install on WooCommerce <ArrowUpRight className="btn-arrow" />
            </a>
            <button
              className={`nav-burger${open ? " is-open" : ""}`}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              <i />
              <i />
              <i />
            </button>
          </div>
        </div>

        <div className="nav-mobile" hidden={!open}>
          {links.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a className="btn btn-dark" href={SHOPIFY_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            Install on Shopify <ArrowUpRight className="btn-arrow" />
          </a>
          <a className="btn btn-ghost" href={WOO_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            Install on WooCommerce <ArrowUpRight className="btn-arrow" />
          </a>
        </div>
      </div>
    </header>
  );
}
