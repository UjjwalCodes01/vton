import Image from "next/image";
import { Sparkle } from "./icons";

/**
 * The About illustration, brought to life the same way as the hero.
 *
 * The cards overlap the model, so they cannot float on their own without
 * leaving a gap or a ghost behind them; the whole artwork floats as one piece
 * instead, and the story plays out on the cards themselves, on a single loop:
 * a scan passes down the Before photo, the After photo resolves from a blur as
 * if it were being generated, a "Styling…" chip shows while it does, and the
 * After label pings when the look lands. The After overlay is a crop of the
 * same artwork (public/about-after-live.webp), so at rest it is pixel-for-pixel
 * the picture underneath.
 *
 * CSS-only and gated behind html.motion (components/motion/Motion.tsx): with
 * reduced motion it is the still image it always was.
 */
export default function AboutVisual() {
  return (
    <div className="about-art">
      <Image
        src="/mantryon-cutout.png"
        alt="Before and after: the same model shown in his own photo and in an AI-generated try-on"
        fill
        sizes="(max-width: 900px) 100vw, 56vw"
      />

      <span className="about-scan" aria-hidden="true" />

      <div className="about-after-live" aria-hidden="true">
        <Image src="/about-after-live.webp" alt="" fill sizes="(max-width: 900px) 24vw, 14vw" />
        <span className="about-chip">
          <Sparkle /> Styling…
        </span>
      </div>

      <span className="about-after-ping" aria-hidden="true" />
    </div>
  );
}
