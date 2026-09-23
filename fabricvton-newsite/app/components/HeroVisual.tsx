import Image from "next/image";
import { Sparkle } from "./icons";

/**
 * The hero illustration, split into two floating layers cut from the same original artwork
 * (public/newtopportion.png): the shopper's photo on the left, and the try-on card on the right.
 * A third small crop — the "Try On" result photo — sits on top of the card and loops a soft
 * blur-to-sharp reveal, so the card reads as if it's continuously re-generating the look.
 * All motion is CSS-only and gated behind html.motion (see components/motion/Motion.tsx), so it
 * simply renders as a still image for anyone with reduced-motion set.
 */
export default function HeroVisual() {
  return (
    <div className="hero-art-stack">
      <div className="hero-layer hero-layer-girl">
        <Image
          src="/hero-girl.webp"
          alt="A shopper taking a selfie in her own top and jacket"
          fill
          sizes="(max-width: 900px) 50vw, 28vw"
          priority
        />
      </div>

      <div className="hero-layer hero-layer-card">
        <Image
          src="/hero-card.webp"
          alt="A preview card: her photo beside the same shopper wearing a different top, with a row of other garments to try"
          fill
          sizes="(max-width: 900px) 50vw, 27vw"
          priority
        />

        <span className="hero-swap-ping" aria-hidden="true" />

        <div className="hero-tryon-live" aria-hidden="true">
          <Image src="/hero-tryon-live.webp" alt="" fill sizes="(max-width: 900px) 16vw, 9vw" />
          <span className="hero-tryon-chip">
            <Sparkle /> Styling…
          </span>
        </div>
      </div>
    </div>
  );
}
