"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reveals `[data-reveal]` elements once, as they near the viewport.
 *
 * Driven by one rAF-throttled scroll pass rather than IntersectionObserver so that anchor jumps, tall
 * viewports and the end of the page never leave anything hidden. It only runs when the inline boot script
 * added `html.motion` (no reduced-motion preference); without that class everything renders finished.
 */
export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    if (!document.documentElement.classList.contains("motion")) return;

    let pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    let raf = 0;

    const sweep = () => {
      raf = 0;
      const limit = window.innerHeight * 0.92;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      pending = pending.filter((el) => {
        if (atEnd || el.getBoundingClientRect().top < limit) {
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(sweep);
    };

    sweep();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
