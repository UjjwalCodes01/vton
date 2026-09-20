"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const outfits = [
  { id: "dress", emoji: "👗", label: "Red Dress", color: "#fce7f3", accent: "#ec4899", bg: "#fdf2f8" },
  { id: "jacket", emoji: "🧥", label: "Denim Jacket", color: "#dbeafe", accent: "#3b82f6", bg: "#eff6ff" },
  { id: "tee", emoji: "👕", label: "Graphic Tee", color: "#d1fae5", accent: "#10b981", bg: "#ecfdf5" },
  { id: "blazer", emoji: "🤵", label: "Black Blazer", color: "#e5e7eb", accent: "#374151", bg: "#f9fafb" },
];

export function TapToDress() {
  const [selected, setSelected] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const currentOutfit = outfits.find((o) => o.id === applied);

  function handleSelect(id: string) {
    if (scanning) return;
    setSelected(id);
    setScanning(true);
    setApplied(null);

    setTimeout(() => {
      setApplied(id);
      setScanning(false);
    }, 1400);
  }

  return (
    <div className="tapdress-wrapper">
      <div className="tapdress-card">
        {/* Model area */}
        <div
          className="tapdress-model-area"
          style={{ background: applied ? currentOutfit?.bg : "#f8fafc" }}
        >
          {/* AI Scan overlay */}
          <AnimatePresence>
            {scanning && (
              <motion.div
                className="tapdress-scan-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="tapdress-scan-line"
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                />
                <div className="tapdress-scan-label">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    AI generating try-on…
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model silhouette SVG */}
          <svg viewBox="0 0 140 280" width="120" height="240" style={{ position: "relative", zIndex: 1 }}>
            {/* Head */}
            <ellipse cx="70" cy="40" rx="24" ry="28" fill="#cbd5e1" />
            {/* Hair */}
            <ellipse cx="70" cy="20" rx="24" ry="12" fill="#94a3b8" />
            {/* Body — changes color based on outfit */}
            <AnimatePresence mode="wait">
              <motion.rect
                key={applied ?? "none"}
                x="38" y="68" width="64" height="90" rx="12"
                fill={applied ? currentOutfit?.color : "#e2e8f0"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </AnimatePresence>
            {/* Arms */}
            <rect x="14" y="72" width="26" height="62" rx="13"
              fill={applied ? currentOutfit?.color : "#e2e8f0"} />
            <rect x="100" y="72" width="26" height="62" rx="13"
              fill={applied ? currentOutfit?.color : "#e2e8f0"} />
            {/* Legs */}
            <rect x="42" y="155" width="24" height="80" rx="12" fill="#cbd5e1" />
            <rect x="74" y="155" width="24" height="80" rx="12" fill="#cbd5e1" />

            {/* Clothing emoji overlay */}
            <AnimatePresence>
              {applied && !scanning && (
                <motion.text
                  x="70" y="120"
                  textAnchor="middle"
                  fontSize="36"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  {currentOutfit?.emoji}
                </motion.text>
              )}
            </AnimatePresence>
          </svg>

          {/* Applied badge */}
          <AnimatePresence>
            {applied && !scanning && (
              <motion.div
                className="tapdress-applied-badge"
                style={{ background: currentOutfit?.accent }}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 250 }}
              >
                ✓ {currentOutfit?.label}
              </motion.div>
            )}
          </AnimatePresence>

          {!applied && !scanning && (
            <p className="tapdress-idle-hint">👇 Pick an outfit below</p>
          )}
        </div>

        {/* Outfit selector */}
        <div className="tapdress-selector">
          {outfits.map((outfit) => (
            <motion.button
              key={outfit.id}
              className={`tapdress-btn ${selected === outfit.id ? "tapdress-btn-active" : ""}`}
              style={{
                background: outfit.color,
                borderColor: selected === outfit.id ? outfit.accent : "transparent",
                boxShadow: selected === outfit.id ? `0 0 0 3px ${outfit.accent}33` : "none",
              }}
              onClick={() => handleSelect(outfit.id)}
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
            >
              <span className="tapdress-btn-emoji">{outfit.emoji}</span>
              <span className="tapdress-btn-label">{outfit.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <p className="tapdress-caption">
        This is exactly what your customers experience — instantly, on your product page.
      </p>
    </div>
  );
}
