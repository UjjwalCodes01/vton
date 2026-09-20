"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { EVIDENCE } from "../_lib/content";
import { cssVars } from "../_lib/style";
import { Slot } from "./Slot";

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/**
 * Before / after comparison. Drag anywhere on the frame, or focus the handle and use the arrow
 * keys. The handle carries the slider semantics (role, min/max/now), so it works with a screen
 * reader and without a pointer. Position is applied through one custom property, `--pos`, which
 * only drives clip-path and left offsets.
 */
export default function Evidence() {
  const [pos, setPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromClientX = (clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setPos(Math.round(clamp(((clientX - rect.left) / rect.width) * 100)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -10,
      PageUp: 10,
    };
    if (e.key in moves) {
      e.preventDefault();
      setPos((p) => clamp(p + moves[e.key]));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPos(100);
    }
  };

  return (
    <section className="fv-evidence" id="evidence" data-nav-theme="dark" aria-labelledby="evidence-title">
      <div className="fv-wrap">
        <div data-reveal>
          <p className="fv-eyebrow">EVIDENCE</p>
          <h2 className="fv-h2" id="evidence-title">
            The same garment, on someone new.
          </h2>
          <p className="fv-lead">
            Drag the handle to compare the original photograph with the generated result. Look at the print, the
            seams and the way the fabric folds.
          </p>
        </div>

        <div
          className="fv-compare"
          ref={frameRef}
          style={cssVars({ "--pos": `${pos}%` })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <div className="fv-compare-layer fv-compare-layer--before">
            <Slot slot={EVIDENCE.before} sizes="(max-width: 599px) 100vw, 560px" dark />
          </div>
          <div className="fv-compare-layer fv-compare-layer--after">
            <Slot slot={EVIDENCE.after} sizes="(max-width: 599px) 100vw, 560px" dark />
          </div>

          <span className="fv-compare-tag fv-compare-tag--after">Generated</span>
          <span className="fv-compare-tag fv-compare-tag--before">Original</span>
          <span className="fv-compare-divider" />

          <button
            type="button"
            className="fv-compare-handle"
            role="slider"
            aria-label="Reveal the generated result"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pos}
            aria-valuetext={`${pos}% generated`}
            onKeyDown={onKeyDown}
          >
            <span aria-hidden="true">◀▶</span>
          </button>
        </div>

        <p className="fv-caption">{EVIDENCE.caption}</p>
      </div>
    </section>
  );
}
