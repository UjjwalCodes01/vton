"use client";

import { motion, useSpring, useTransform, animate } from "framer-motion";
import { useState, useEffect, useRef } from "react";

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = prevValue.current;
    prevValue.current = value;

    const ctrl = animate(from, value, {
      duration: 0.7,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate(v) {
        node.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => ctrl.stop();
  }, [value]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

export function ROICalculator() {
  const [traffic, setTraffic] = useState(5000);
  const [aov, setAov] = useState(75);

  // Conversion lift: 67% more conversions, baseline 2% CVR
  const baseConversions = traffic * 0.02;
  const liftedConversions = Math.round(traffic * 0.02 * 1.67);
  const extraOrders = liftedConversions - Math.round(baseConversions);
  const extraRevenue = extraOrders * aov;

  // Glow intensity based on revenue (0-1)
  const maxRevenue = 5000 * 0.02 * 1.67 * 500; // max traffic * max aov
  const glowIntensity = Math.min(extraRevenue / 50000, 1);

  return (
    <div className="roi-wrapper" style={{ "--glow-intensity": glowIntensity } as React.CSSProperties}>
      <div className="roi-glow" />
      <div className="roi-card">
        <div className="roi-header">
          <p className="faq-subtitle" style={{ margin: 0 }}>ROI Calculator</p>
          <h3 className="roi-title">How much will you make?</h3>
          <p className="roi-subtitle">Drag the sliders to see your projected extra revenue from try-on.</p>
        </div>

        <div className="roi-sliders">
          {/* Monthly Traffic */}
          <div className="roi-slider-group">
            <div className="roi-slider-label">
              <span>Monthly Visitors</span>
              <strong><AnimatedNumber value={traffic} /></strong>
            </div>
            <div className="roi-slider-track-wrap">
              <input
                type="range"
                min={500}
                max={50000}
                step={500}
                value={traffic}
                onChange={(e) => setTraffic(Number(e.target.value))}
                className="roi-range"
                style={{ "--pct": `${((traffic - 500) / 49500) * 100}%` } as React.CSSProperties}
              />
            </div>
            <div className="roi-slider-range-labels"><span>500</span><span>50,000</span></div>
          </div>

          {/* Average Order Value */}
          <div className="roi-slider-group">
            <div className="roi-slider-label">
              <span>Average Order Value</span>
              <strong>$<AnimatedNumber value={aov} /></strong>
            </div>
            <div className="roi-slider-track-wrap">
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="roi-range"
                style={{ "--pct": `${((aov - 10) / 490) * 100}%` } as React.CSSProperties}
              />
            </div>
            <div className="roi-slider-range-labels"><span>$10</span><span>$500</span></div>
          </div>
        </div>

        {/* Results */}
        <div className="roi-results">
          <div className="roi-result-card">
            <p className="roi-result-label">Extra Orders / Month</p>
            <p className="roi-result-value">
              +<AnimatedNumber value={extraOrders} />
            </p>
          </div>
          <div className="roi-result-divider" />
          <div className="roi-result-card roi-result-main">
            <p className="roi-result-label">Projected Extra Revenue</p>
            <p className="roi-result-value roi-result-big">
              $<AnimatedNumber value={extraRevenue} />
              <span className="roi-result-period">/mo</span>
            </p>
            <p className="roi-result-note">Based on 67% avg conversion lift from try-on</p>
          </div>
          <div className="roi-result-divider" />
          <div className="roi-result-card">
            <p className="roi-result-label">Annual Extra Revenue</p>
            <p className="roi-result-value">
              $<AnimatedNumber value={extraRevenue * 12} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
