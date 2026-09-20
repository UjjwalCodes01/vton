/**
 * FabricVTON company site: motion engine.
 *
 * Plain DOM, no dependencies. It does four small jobs and nothing else:
 *   1. reveals      [data-reveal]      add `.is-in` once, via one IntersectionObserver
 *   2. scroll state [data-progress]    write `--p` (0..1) on a section, from ONE rAF-throttled scroll listener
 *   3. parallax     [data-parallax]    pointer -> `--px`/`--py` (-1..1), fine pointers only, rAF loop that sleeps when settled
 *   4. magnets      [data-magnet]      nudge the arrow inside a control by <= 4px toward the cursor
 * plus the nav's `data-scrolled` flag.
 *
 * The CSS does all the visual work from those numbers, using transform / opacity / clip-path only.
 * When the visitor prefers reduced motion nothing is animated and no `--p` is written, so every
 * section keeps the finished state that the stylesheet defaults to.
 *
 * `data-progress` modes
 *   hero     0 -> 1 over the first ~90% of the section's height
 *   pin      0 -> 1 while a tall section scrolls past its sticky child (falls back to `through` when not pinned)
 *   through  0 -> 1 as the section travels from entering the viewport to sitting fully inside it
 */

type Track = { el: HTMLElement; mode: string; visible: boolean; last: number };

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

export function initMotion(root: ParentNode = document): () => void {
  const win = window;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = win.matchMedia("(hover: hover) and (pointer: fine)");
  const pinned = win.matchMedia("(min-width: 900px) and (min-height: 560px)");
  const disposers: Array<() => void> = [];

  /* ---- 1. reveals ------------------------------------------------------ */
  const revealEls = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (reduce.matches || !("IntersectionObserver" in win)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    revealEls.forEach((el) => io.observe(el));
    disposers.push(() => io.disconnect());
  }

  /* ---- 2. scroll state ------------------------------------------------- */
  const nav = root.querySelector<HTMLElement>(".fv-nav");
  const tracks: Track[] = Array.from(root.querySelectorAll<HTMLElement>("[data-progress]")).map((el) => ({
    el,
    mode: el.getAttribute("data-progress") || "through",
    visible: true,
    last: -1,
  }));

  if (!reduce.matches && "IntersectionObserver" in win) {
    // Only do per-frame work for sections that are (nearly) on screen.
    const vio = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const t = tracks.find((tr) => tr.el === entry.target);
          if (t) t.visible = entry.isIntersecting;
        }
      },
      { rootMargin: "60% 0px 60% 0px" },
    );
    tracks.forEach((t) => vio.observe(t.el));
    disposers.push(() => vio.disconnect());
  }

  let scheduled = false;
  const frame = () => {
    scheduled = false;
    const vh = win.innerHeight;
    if (nav) nav.setAttribute("data-scrolled", win.scrollY > 24 ? "true" : "false");
    if (reduce.matches) return;

    for (const t of tracks) {
      if (!t.visible) continue;
      const rect = t.el.getBoundingClientRect();
      let p: number;
      if (t.mode === "hero") {
        p = clamp(-rect.top / Math.max(1, rect.height * 0.9));
      } else if (t.mode === "pin" && pinned.matches) {
        p = clamp(-rect.top / Math.max(1, rect.height - vh));
      } else {
        p = clamp((vh * 0.85 - rect.top) / Math.max(1, rect.height * 0.9));
      }
      p = Math.round(p * 1000) / 1000;
      if (p !== t.last) {
        t.last = p;
        t.el.style.setProperty("--p", String(p));
      }
    }
  };
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      win.requestAnimationFrame(frame);
    }
  };
  win.addEventListener("scroll", schedule, { passive: true });
  win.addEventListener("resize", schedule, { passive: true });
  win.addEventListener("load", schedule);
  disposers.push(() => {
    win.removeEventListener("scroll", schedule);
    win.removeEventListener("resize", schedule);
    win.removeEventListener("load", schedule);
  });
  frame();

  /* ---- 3. pointer parallax (fine pointers only) ------------------------- */
  if (!reduce.matches && fine.matches) {
    root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      const host: HTMLElement = el.closest("section") || el;
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;
      let raf = 0;
      const step = () => {
        cx += (tx - cx) * 0.085;
        cy += (ty - cy) * 0.085;
        el.style.setProperty("--px", cx.toFixed(3));
        el.style.setProperty("--py", cy.toFixed(3));
        raf = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 ? win.requestAnimationFrame(step) : 0;
      };
      const kick = () => {
        if (!raf) raf = win.requestAnimationFrame(step);
      };
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
        ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
        kick();
      };
      const onLeave = () => {
        tx = 0;
        ty = 0;
        kick();
      };
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
      disposers.push(() => {
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
        if (raf) win.cancelAnimationFrame(raf);
      });
    });
  }

  /* ---- 4. magnetic arrows (fine pointers only) -------------------------- */
  if (!reduce.matches && fine.matches) {
    root.querySelectorAll<HTMLElement>("[data-magnet]").forEach((el) => {
      const arrow = el.querySelector<HTMLElement>(".fv-arrow, .fv-post-arrow, .fv-field-arrow");
      if (!arrow) return;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
        arrow.style.setProperty("--mx", (dx * 4).toFixed(2) + "px");
        arrow.style.setProperty("--my", (dy * 3).toFixed(2) + "px");
      };
      const onLeave = () => {
        arrow.style.removeProperty("--mx");
        arrow.style.removeProperty("--my");
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      disposers.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    });
  }

  return () => disposers.forEach((d) => d());
}
