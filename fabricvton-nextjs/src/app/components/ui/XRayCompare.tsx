"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/* ── Before / After image pairs ── */
const PAIRS = [
  {
    id: 1,
    label: "Look 1",
    before: "/model_images/original/7.jpg",
    after:  "/model_images/generated/7_generated.jpg",
  },
  {
    id: 2,
    label: "Look 2",
    before: "/model_images/original/9.jpg",
    after:  "/model_images/generated/9_generated.jpg",
  },
  {
    id: 3,
    label: "Look 3",
    before: "/model_images/original/2.jpeg",
    after:  "/model_images/generated/2_generated.jpg",
  },
];

const RADIUS = 140;

export function XRayCompare() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePair, setActivePair] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [clipR, setClipR] = useState(0);

  /* spring for the radius only */
  const rawR = useMotionValue(0);
  const springR = useSpring(rawR, { stiffness: 320, damping: 30 });

  useEffect(() => {
    const unsub = springR.on("change", (v) => setClipR(v));
    return unsub;
  }, [springR]);

  const open = () => {
    setIsActive(true);
    rawR.set(RADIUS);
  };
  const close = () => {
    rawR.set(0);
    setTimeout(() => setIsActive(false), 350);
  };

  const trackMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const trackTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const t = e.touches[0];
    const r = containerRef.current.getBoundingClientRect();
    setPos({ x: t.clientX - r.left, y: t.clientY - r.top });
  };

  /* Switch pair without losing hover state */
  const switchPair = (idx: number) => {
    setActivePair(idx);
    rawR.set(0);
    setTimeout(() => rawR.set(isActive ? RADIUS : 0), 60);
  };

  const pair = PAIRS[activePair];

  return (
    <div className="xray-wrapper">
      {/* Main comparison container */}
      <div
        ref={containerRef}
        className="xray-container"
        onMouseEnter={open}
        onMouseLeave={close}
        onMouseMove={trackMouse}
        onTouchStart={(e) => { open(); trackTouch(e); }}
        onTouchMove={trackTouch}
        onTouchEnd={close}
      >
        {/* Bottom layer — Before */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pair.before} alt="Before try-on" className="xray-img" draggable={false} />

        {/* Top layer — After (AI result) with clip-path spotlight */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pair.after}
          alt="After try-on"
          className="xray-img xray-after"
          style={{
            clipPath: `circle(${clipR}px at ${pos.x}px ${pos.y}px)`,
            WebkitClipPath: `circle(${clipR}px at ${pos.x}px ${pos.y}px)`,
          }}
          draggable={false}
        />

        {/* Glowing ring that follows cursor */}
        {isActive && (
          <div
            className="xray-ring"
            style={{
              left: pos.x,
              top: pos.y,
              width: clipR * 2,
              height: clipR * 2,
            }}
          />
        )}

        {/* Floating corner labels */}
        <span className="xray-label xray-label-before">Original</span>
        <motion.span
          className="xray-label xray-label-after"
          animate={{ opacity: clipR > 30 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          AI Try-On ✦
        </motion.span>

        {/* Idle hint — disappears when active */}
        <motion.div
          className="xray-hint"
          animate={{ opacity: isActive ? 0 : 1, y: isActive ? 6 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="xray-hint-inner">
            <span className="xray-hint-cursor">⬡</span>
            <span>Move cursor to reveal AI try-on</span>
          </div>
        </motion.div>

        {/* "Powered by" badge */}
        <div className="xray-powered-badge">
          <span>✦</span> FabricVTON AI
        </div>
      </div>

      {/* Pair selector — 3 thumbnail switcher tabs */}
      <div className="xray-selector">
        {PAIRS.map((p, i) => (
          <button
            key={p.id}
            className={`xray-thumb-btn ${i === activePair ? "active" : ""}`}
            onClick={() => switchPair(i)}
            aria-label={p.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.before} alt={p.label} className="xray-thumb-img" />
            <span className="xray-thumb-dot" />
          </button>
        ))}
      </div>
    </div>
  );
}
