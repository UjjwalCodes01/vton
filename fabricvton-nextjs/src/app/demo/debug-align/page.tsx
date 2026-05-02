"use client";

import { useState } from "react";

export default function DebugAlignPage() {
  const [scale, setScale] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [opacity, setOpacity] = useState(0.5);

  const before = "/model_images/original/9.jpg";
  const after = "/model_images/generated/9_generated.jpg"; // Using the raw uncropped image from ChatGPT

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", display: "flex", gap: "40px" }}>
      {/* Controls */}
      <div style={{ width: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2>Visual Alignment Debugger</h2>
        <p>Adjust these sliders until the model perfectly overlaps. Then copy the CSS below!</p>
        
        <div>
          <label>Opacity (Top Layer): {opacity}</label>
          <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        
        <div>
          <label>Scale: {scale}</label>
          <input type="range" min="0.5" max="2" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div>
          <label>Translate X (Horizontal): {x}px</label>
          <input type="range" min="-300" max="300" step="1" value={x} onChange={(e) => setX(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div>
          <label>Translate Y (Vertical): {y}px</label>
          <input type="range" min="-300" max="300" step="1" value={y} onChange={(e) => setY(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ background: "#1e293b", color: "#22d3ee", padding: "16px", borderRadius: "8px", marginTop: "20px" }}>
          <strong>Add this to XRayCompare PAIRS:</strong><br/><br/>
          <code>
            afterTransform: "scale({scale}) translate({x}px, {y}px)"
          </code>
        </div>
      </div>

      {/* Visualizer */}
      <div style={{ position: "relative", width: "400px", height: "600px", border: "2px solid #ccc", overflow: "hidden", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={before} 
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", zIndex: 1 }} 
          alt="Before" 
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={after} 
          style={{ 
            position: "absolute", 
            inset: 0, 
            width: "100%", 
            height: "100%", 
            objectFit: "cover", 
            objectPosition: "top center", 
            zIndex: 2,
            opacity: opacity,
            transform: `scale(${scale}) translate(${x}px, ${y}px)`,
            transformOrigin: "top center"
          }} 
          alt="After" 
        />
      </div>
    </div>
  );
}
