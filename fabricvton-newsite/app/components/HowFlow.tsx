"use client";

import Image from "next/image";
import { useState } from "react";
import { Hanger, Upload, Wand } from "./icons";
import TryOnDemo from "./TryOnDemo";

/**
 * The original "How it works" area: header, three step cards and the "3 Steps to a New You" portrait.
 * The three static figures are replaced by the interactive try-on window, sitting on a shaded panel, and
 * the step cards above follow what the shopper is doing in it.
 */

const STEPS = [
  { num: "01", icon: <Upload />, title: "Upload Your Photo", copy: "Choose one clear photo of yourself." },
  { num: "02", icon: <Hanger />, title: "Choose a Product", copy: "Pick any piece in the store and press Try it on." },
  { num: "03", icon: <Wand />, title: "See It on You", copy: "Your look appears on your own photo." },
];

export default function HowFlow() {
  const [stage, setStage] = useState(1);

  return (
    <section className="section how" id="how">
      <div className="shell">
        <div className="how-top">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="display">
              Get Your Virtual
              <br />
              Try-On in 3 Simple Steps
            </h2>
          </div>

          <div className="step-cards">
            {STEPS.map((step, i) => (
              <article className={`step-card${stage === i + 1 ? " is-current" : ""}`} key={step.num}>
                <span className="num">{step.num}</span>
                <span className="icon-chip">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="how-bottom">
          <div className="how-editorial">
            <Image src="/how-editorial.jpg" alt="Editorial portrait with the line: 3 steps to a new you" width={824} height={900} sizes="(max-width: 1100px) 100vw, 30vw" />
          </div>

          <div className="how-widget">
            <TryOnDemo onStage={setStage} />
          </div>
        </div>
      </div>
    </section>
  );
}
