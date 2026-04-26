"use client";

import { motion } from "framer-motion";

interface MovingBorderCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MovingBorderCard({ children, className = "" }: MovingBorderCardProps) {
  return (
    <div className={`moving-border-wrapper ${className}`}>
      <motion.div
        className="moving-border-gradient"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="moving-border-inner">{children}</div>
    </div>
  );
}
