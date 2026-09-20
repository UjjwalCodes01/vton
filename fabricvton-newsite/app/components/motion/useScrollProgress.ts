"use client";

import { useEffect, useRef } from "react";

/**
 * Writes `--p` (0 to 1) on the element as its tall "runway" scrolls through a sticky viewport: 0 when the
 * runway's top reaches the top of the screen, 1 when its bottom reaches the bottom. One rAF-throttled
 * scroll listener; only a CSS custom property changes, so nothing re-renders unless `onProgress` asks.
 */
export function useScrollProgress<T extends HTMLElement>(onProgress?: (p: number) => void) {
  const ref = useRef<T>(null);
  const callback = useRef(onProgress);

  useEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      callback.current?.(p);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
