"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Sparkles, Info } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const handleHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  };

  const isHome = pathname === "/";
  const isDemo = pathname.startsWith("/demo");
  const isStudio = pathname.startsWith("/studio");
  const isAbout = pathname === "/about";

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        <Link
          href="/"
          className={`mobile-tab-btn ${isHome ? "active" : ""}`}
          onClick={handleHaptic}
          aria-label="Home"
        >
          <Home size={20} />
          <span>Home</span>
          {isHome && <div className="mobile-tab-indicator" />}
        </Link>

        <Link
          href="/demo"
          className={`mobile-tab-btn ${isDemo ? "active" : ""}`}
          onClick={handleHaptic}
          aria-label="Demo Store"
        >
          <ShoppingBag size={20} />
          <span>Store</span>
          {isDemo && <div className="mobile-tab-indicator" />}
        </Link>

        <Link
          href="/studio"
          className={`mobile-tab-btn studio-tab ${isStudio ? "active" : ""}`}
          onClick={handleHaptic}
          aria-label="Try-On Studio"
        >
          <div className="studio-tab-bubble">
            <Sparkles size={20} />
          </div>
          <span>Try-On</span>
        </Link>

        <Link
          href="/about"
          className={`mobile-tab-btn ${isAbout ? "active" : ""}`}
          onClick={handleHaptic}
          aria-label="About"
        >
          <Info size={20} />
          <span>About</span>
          {isAbout && <div className="mobile-tab-indicator" />}
        </Link>
      </div>
    </nav>
  );
}
