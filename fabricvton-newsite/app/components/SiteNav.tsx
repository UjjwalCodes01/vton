"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "./icons";

const links = [
  { href: "/", label: "Features" },
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
            <button className="nav-icon" type="button" aria-label="Search">
              <Search />
            </button>
            <Link className="nav-signin" href="/#signin">
              Sign In
            </Link>
            <Link className="btn btn-dark btn-sm" href="/#try">
              Try Now <ArrowRight className="btn-arrow" />
            </Link>
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
          <Link href="/#signin" onClick={() => setOpen(false)}>
            Sign In
          </Link>
          <Link className="btn btn-dark" href="/#try" onClick={() => setOpen(false)}>
            Try Now <ArrowRight className="btn-arrow" />
          </Link>
        </div>
      </div>
    </header>
  );
}
