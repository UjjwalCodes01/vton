/**
 * FabricVTON company site: motion engine.
 *
 * Plain DOM, no dependencies. It does three small jobs:
 *   1. reveals      [data-reveal]      add `.is-in` once, swept from the same scroll pass
 *   2. scroll state [data-progress]    write `--p` (0..1) on a section, from ONE rAF-throttled
 *                                      scroll listener; the same pass flips the nav to its dark
 *                                      variant while the header sits over a [data-nav-theme] section
 *   3. parallax     [data-parallax]    pointer -> `--px`/`--py` (-1..1), fine pointers only
 *
 * The CSS does all the visual work from those numbers, using transform, opacity and clip-path only.
 * When the visitor prefers reduced motion nothing is animated and no `--p` is written, so every
 * section keeps the finished state the stylesheet defaults to.
 */

type Track = { el: HTMLElement; mode: string; visible: boolean; last: number };

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

export function initMotion(root: ParentNode = document): () => void {
  const win = window;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = win.matchMedia("(hover: hover) and (pointer: fine)");
  const disposers: Array<() => void> = [];

  /* ---- 1. reveals ------------------------------------------------------ */
  // Driven by the same rAF scroll pass as everything else rather than an IntersectionObserver.
  // An observer only reports what it happens to notice; this sweeps every remaining element on
  // each frame, so nothing can stay stuck in its hidden state after an anchor jump, a fast
  // scroll, a restored scroll position or a prerender. The list shrinks as elements reveal.
  const revealEls = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  let pending: HTMLElement[] = reduce.matches ? [] : revealEls;
  if (reduce.matches) revealEls.forEach((el) => el.classList.add("is-in"));

  const sweepReveals = () => {
    if (pending.length === 0) return;
    const limit = win.innerHeight * 0.92;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top >= limit) return true;
      el.classList.add("is-in");
      return false;
    });
  };

  /* ---- 2. scroll state + nav theme ------------------------------------- */
  const nav = root.querySelector<HTMLElement>(".fv-nav");
  const darkSections = Array.from(root.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]'));
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

    if (nav) {
      // The header inverts while its midline is inside a dark section.
      const mid = nav.getBoundingClientRect().height / 2;
      const overDark = darkSections.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      nav.setAttribute("data-theme", overDark ? "dark" : "light");
    }

    sweepReveals();
    if (reduce.matches) return;

    const vh = win.innerHeight;
    for (const t of tracks) {
      if (!t.visible) continue;
      const rect = t.el.getBoundingClientRect();
      const p =
        t.mode === "hero"
          ? clamp(-rect.top / Math.max(1, rect.height * 0.9))
          : clamp((vh * 0.85 - rect.top) / Math.max(1, rect.height * 0.9));
      const rounded = Math.round(p * 1000) / 1000;
      if (rounded !== t.last) {
        t.last = rounded;
        t.el.style.setProperty("--p", String(rounded));
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

  /* ---- 3. pointer parallax (fine pointers only) ------------------------ */
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

  return () => disposers.forEach((d) => d());
}
