"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

/**
 * A small colour picker: a shade area (saturation across, brightness up), a hue slider and a hex field.
 * Controlled by a `#rrggbb` value. The hue is remembered separately so dragging through black or grey
 * doesn't lose it.
 */

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export default function ShadePicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const derived = hexToHsv(value);
  const [hue, setHue] = useState(derived.h);
  const [typed, setTyped] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);

  const h = derived.s > 0.02 && derived.v > 0.02 ? derived.h : hue;
  const { s, v } = derived;

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const ns = clamp((event.clientX - rect.left) / rect.width);
    const nv = 1 - clamp((event.clientY - rect.top) / rect.height);
    onChange(hsvToHex(h, ns, nv));
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    let ns = s;
    let nv = v;
    if (event.key === "ArrowLeft") ns = clamp(s - step);
    else if (event.key === "ArrowRight") ns = clamp(s + step);
    else if (event.key === "ArrowUp") nv = clamp(v + step);
    else if (event.key === "ArrowDown") nv = clamp(v - step);
    else return;
    event.preventDefault();
    onChange(hsvToHex(h, ns, nv));
  };

  return (
    <div className="sp">
      <div
        ref={area}
        className="sp-area"
        style={{ "--h": Math.round(h) } as CSSProperties}
        tabIndex={0}
        role="group"
        aria-label="Shade: left to right is saturation, bottom to top is brightness. Use the arrow keys."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons & 1) pick(event);
        }}
        onKeyDown={onKey}
      >
        <span className="sp-thumb" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }} />
      </div>

      <div className="sp-row">
        <input
          className="sp-hue"
          type="range"
          min={0}
          max={360}
          value={Math.round(h)}
          aria-label="Hue"
          onChange={(event) => {
            const next = Number(event.target.value);
            setHue(next);
            onChange(hsvToHex(next, s, v));
          }}
        />
        <input
          className="sp-hex"
          type="text"
          value={typed ?? value.toUpperCase()}
          maxLength={7}
          spellCheck={false}
          aria-label="Hex colour"
          onChange={(event) => {
            const next = event.target.value;
            setTyped(next);
            const candidate = next.startsWith("#") ? next : `#${next}`;
            if (/^#[0-9a-f]{6}$/i.test(candidate)) onChange(candidate.toLowerCase());
          }}
          onBlur={() => setTyped(null)}
        />
      </div>
    </div>
  );
}
