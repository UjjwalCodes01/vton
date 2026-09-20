"use client";

import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

/* ── Animated SVG: scanning line for Auto-Crop card ── */
function ScanningDemo() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bento-demo-area"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg viewBox="0 0 180 140" width="180" height="140" style={{ display: "block" }}>
        {/* Dummy model silhouette */}
        <ellipse cx="90" cy="40" rx="20" ry="24" fill="#e2e8f0" />
        <rect x="68" y="62" width="44" height="56" rx="10" fill="#e2e8f0" />
        <rect x="56" y="64" width="16" height="42" rx="8" fill="#e2e8f0" />
        <rect x="108" y="64" width="16" height="42" rx="8" fill="#e2e8f0" />
        <rect x="72" y="116" width="14" height="22" rx="7" fill="#e2e8f0" />
        <rect x="94" y="116" width="14" height="22" rx="7" fill="#e2e8f0" />

        {/* Corner brackets */}
        {[
          { x: 8, y: 8, r: "0 0 0 0" },
          { x: 164, y: 8, r: "0 0 0 0" },
          { x: 8, y: 124, r: "0 0 0 0" },
          { x: 164, y: 124, r: "0 0 0 0" },
        ].map((_, i) => null)}
        {/* top-left */}
        <path d="M10 26 L10 10 L26 10" stroke="#0d9488" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* top-right */}
        <path d="M154 10 L170 10 L170 26" stroke="#0d9488" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* bottom-left */}
        <path d="M10 114 L10 130 L26 130" stroke="#0d9488" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* bottom-right */}
        <path d="M154 130 L170 130 L170 114" stroke="#0d9488" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Scan line */}
        <AnimatePresence>
          {hovered && (
            <motion.line
              key="scan"
              x1="8" y1="0" x2="172" y2="0"
              stroke="rgba(13,148,136,0.7)"
              strokeWidth="2"
              initial={{ y: 8 }}
              animate={{ y: 132 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
            />
          )}
        </AnimatePresence>
        {/* Glow line on scan */}
        <AnimatePresence>
          {hovered && (
            <motion.rect
              key="glow"
              x="8" width="164" height="6" rx="2"
              fill="rgba(13,148,136,0.12)"
              initial={{ y: 8 }}
              animate={{ y: 129 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
            />
          )}
        </AnimatePresence>

        {/* "Detected" label */}
        <AnimatePresence>
          {hovered && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.4 }}>
              <rect x="52" y="2" width="76" height="18" rx="9" fill="rgba(13,148,136,0.9)" />
              <text x="90" y="14" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">
                ✓ Subject Detected
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      <p className="bento-demo-hint">{hovered ? "✓ Subject detected & cropped" : "Hover to see auto-crop"}</p>
    </div>
  );
}

/* ── Animated SVG: line chart drawing itself ── */
function AnalyticsDemo() {
  const [hovered, setHovered] = useState(false);
  const pathPoints = "M10,80 C30,70 50,90 70,55 C90,20 110,65 130,40 C150,15 160,30 170,20";

  return (
    <div
      className="bento-demo-area"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg viewBox="0 0 180 100" width="180" height="100" style={{ display: "block" }}>
        {/* Grid lines */}
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="8" y1={y} x2="172" y2={y} stroke="#e2e8f0" strokeWidth="0.8" />
        ))}
        {/* Area fill */}
        <motion.path
          d="M10,80 C30,70 50,90 70,55 C90,20 110,65 130,40 C150,15 160,30 170,20 L170,90 L10,90 Z"
          fill="url(#chartGrad)"
          opacity="0.25"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={hovered ? { opacity: 0.25 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="rgba(13,148,136,0)" />
          </linearGradient>
        </defs>
        {/* Main line */}
        <motion.path
          d={pathPoints}
          fill="none"
          stroke="#0d9488"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={hovered ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Endpoint dot */}
        <AnimatePresence>
          {hovered && (
            <motion.circle
              cx="170" cy="20" r="5" fill="#0d9488"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ delay: 1, type: "spring" }}
            />
          )}
        </AnimatePresence>
        {/* Conversion lift label */}
        <AnimatePresence>
          {hovered && (
            <motion.g initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 1.1 }}>
              <rect x="130" y="2" width="46" height="16" rx="8" fill="#0d9488" />
              <text x="153" y="13" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif">↑ 67% CVR</text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      <p className="bento-demo-hint">{hovered ? "Hover to watch your CVR climb" : "Hover to see conversion lift"}</p>
    </div>
  );
}

/* ── Animated: Lead capture pulse ── */
function LeadCaptureDemo() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="bento-demo-area"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="bento-lead-demo">
        <div className="bento-lead-icons">
          {["K", "S", "M"].map((label, i) => (
            <motion.div
              key={label}
              className="bento-lead-icon"
              animate={hovered ? { scale: [1, 1.15, 1], y: [0, -4, 0] } : {}}
              transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
            >
              {label}
            </motion.div>
          ))}
        </div>
        <motion.div
          className="bento-lead-arrow"
          animate={hovered ? { scaleX: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.6, repeat: hovered ? Infinity : 0, repeatType: "reverse" }}
        >
          <svg width="32" height="12" viewBox="0 0 32 12">
            <motion.path
              d="M0 6 L26 6 M20 1 L26 6 L20 11"
              stroke="#0d9488" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
              initial={{ strokeDashoffset: 32 }}
              animate={hovered ? { strokeDashoffset: [32, 0] } : { strokeDashoffset: 32 }}
              style={{ strokeDasharray: 32 }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </motion.div>
        <motion.div
          className="bento-lead-count"
          animate={hovered ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <span>+247</span>
          <small>leads synced</small>
        </motion.div>
      </div>
      <p className="bento-demo-hint">Hover to see lead sync</p>
    </div>
  );
}

/* ── Animated: Privacy shield ── */
function PrivacyDemo() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="bento-demo-area"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 80 80" width="80" height="80">
          <motion.path
            d="M40 8 L64 18 L64 42 C64 56 52 68 40 72 C28 68 16 56 16 42 L16 18 Z"
            fill="rgba(13,148,136,0.08)"
            stroke="#0d9488"
            strokeWidth="1.5"
            animate={hovered ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.6 }}
          />
          <motion.text
            x="40" y="45" textAnchor="middle" fontSize="22"
            initial={{ opacity: 1 }}
            animate={hovered ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
            transition={{ duration: 1, repeat: hovered ? Infinity : 0 }}
          >
            🔒
          </motion.text>
        </svg>
        <AnimatePresence>
          {hovered && (
            <motion.div
              style={{ position: "absolute", top: -12, right: -12, background: "#0d9488", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              Auto-deleted in 7 days
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="bento-demo-hint">Photos auto-deleted · Never trained on</p>
    </div>
  );
}

/* ── Bento Grid Component ── */
const bentoItems = [
  {
    id: "analytics",
    label: "Analytics",
    title: "Conversion Intelligence",
    desc: "See exactly how virtual try-on impacts your funnel — from widget open to 'Add to Cart'.",
    demo: <AnalyticsDemo />,
    size: "bento-wide",
  },
  {
    id: "leads",
    label: "Lead Capture",
    title: "Sync to Klaviyo & Shopify",
    desc: "Capture emails during the try-on and push them directly to your marketing tools.",
    demo: <LeadCaptureDemo />,
    size: "",
  },
  {
    id: "privacy",
    label: "Privacy First",
    title: "Zero Data Retention",
    desc: "Customer photos are deleted after 7 days and never used for AI training.",
    demo: <PrivacyDemo />,
    size: "",
  },
];

export function BentoGrid() {
  return (
    <div className="bento-grid">
      {bentoItems.map((item) => (
        <motion.div
          key={item.id}
          className={`bento-card ${item.size}`}
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="bento-card-label">{item.label}</div>
          <h3 className="bento-card-title">{item.title}</h3>
          <p className="bento-card-desc">{item.desc}</p>
          <div className="bento-card-visual">{item.demo}</div>
        </motion.div>
      ))}
    </div>
  );
}
