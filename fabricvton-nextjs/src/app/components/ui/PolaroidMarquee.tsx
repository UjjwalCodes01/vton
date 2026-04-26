"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useState, useRef } from "react";

interface PolaroidItem {
  id: number;
  originalImage: string;
  generatedImage: string;
  label: string;
  item: string;
}

const polaroids: PolaroidItem[] = [
  { id: 1, originalImage: "/model_images/original/1.png", generatedImage: "/model_images/generated/1_generated.jpg", label: "Linen Blazer", item: "Summer Collection" },
  { id: 2, originalImage: "/model_images/original/2.jpeg", generatedImage: "/model_images/generated/2_generated.jpg", label: "Floral Dress", item: "Spring Edit" },
  { id: 3, originalImage: "/model_images/original/3.jpg", generatedImage: "/model_images/generated/3_generated.jpg", label: "Graphic Tee", item: "Street Style" },
  { id: 4, originalImage: "/model_images/original/4.jpg", generatedImage: "/model_images/generated/4_generated.jpg", label: "Denim Jacket", item: "Casual Wear" },
  { id: 6, originalImage: "/model_images/original/6.jpg", generatedImage: "/model_images/generated/6_generated.jpg", label: "Knitwear Top", item: "Autumn Picks" },
  { id: 7, originalImage: "/model_images/original/7.jpg", generatedImage: "/model_images/generated/7_generated.jpg", label: "Silk Blouse", item: "Work Wardrobe" },
];

// Duplicate for infinite loop
const allPolaroids = [...polaroids, ...polaroids, ...polaroids];

function PolaroidCard({ item }: { item: PolaroidItem }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="polaroid-card-wrapper"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <motion.div
        className="polaroid-card-inner"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front — Before */}
        <div className="polaroid-face polaroid-front" style={{ background: "#f1f5f9" }}>
          <div className="polaroid-image-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.originalImage} alt={item.label} className="polaroid-real-img" />
            <div className="polaroid-before-badge">Before</div>
          </div>
          <div className="polaroid-caption" style={{ alignItems: "center", padding: "16px 14px" }}>
            <p className="polaroid-label">Hover to try on →</p>
          </div>
        </div>

        {/* Back — After */}
        <div className="polaroid-face polaroid-back" style={{ background: "#ccfbf1" }}>
          <div className="polaroid-image-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.generatedImage} alt="AI Generation" className="polaroid-real-img" />
            <div className="polaroid-after-badge">AI Try-On ✓</div>
          </div>
          <div className="polaroid-caption" style={{ alignItems: "center", padding: "16px 14px" }}>
            <p className="polaroid-label">AI Try-On Result</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function PolaroidMarquee() {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="marquee-outer"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fade edges */}
      <div className="marquee-fade marquee-fade-left" />
      <div className="marquee-fade marquee-fade-right" />

      <div
        className="marquee-track"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {allPolaroids.map((item, i) => (
          <PolaroidCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
