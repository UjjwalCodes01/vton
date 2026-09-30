"use client";

import { useEffect } from "react";

/**
 * Reading progress bar and "On this page" scroll-spy for a docs chapter. Works on the DOM the server
 * rendered: it writes `--read` on the progress bar and `aria-current` on the matching contents link.
 * Renders nothing itself.
 */
export default function DocsChrome() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".dx-progress");
    const article = document.querySelector<HTMLElement>(".dx-article");
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".dx-toc a[href^='#']"));
    const heads = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((h): h is HTMLElement => !!h);

    let raf = 0;
    const update = () => {
      raf = 0;
      if (bar && article) {
        const r = article.getBoundingClientRect();
        const total = Math.max(1, r.height - window.innerHeight * 0.6);
        const read = Math.min(1, Math.max(0, -r.top / total));
        bar.style.setProperty("--read", read.toFixed(4));
      }
      if (heads.length) {
        const line = window.innerHeight * 0.28;
        let active = heads[0];
        for (const h of heads) if (h.getBoundingClientRect().top <= line) active = h;
        links.forEach((a) => {
          if (a.hash.slice(1) === active.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
