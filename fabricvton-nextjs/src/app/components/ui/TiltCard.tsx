"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export function TiltCard({ children, className = "", intensity = 12 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawGlareX = useMotionValue(50);
  const rawGlareY = useMotionValue(50);

  const x = useSpring(rawX, { stiffness: 280, damping: 28 });
  const y = useSpring(rawY, { stiffness: 280, damping: 28 });

  const rotateX = useTransform(y, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-intensity, intensity]);

  const glareX = useSpring(rawGlareX, { stiffness: 200, damping: 30 });
  const glareY = useSpring(rawGlareY, { stiffness: 200, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawX.set(px - 0.5);
    rawY.set(py - 0.5);
    rawGlareX.set(px * 100);
    rawGlareY.set(py * 100);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    rawGlareX.set(50);
    rawGlareY.set(50);
  }

  return (
    <motion.div
      ref={ref}
      className={`tilt-card-wrapper ${className}`}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="tilt-glare"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.18) 0%, transparent 70%)`
          ),
        }}
      />
      <div style={{ transform: "translateZ(12px)" }}>{children}</div>
    </motion.div>
  );
}
