import Image from "next/image";
import type { ImageSlot } from "../_lib/content";

/**
 * Renders a real image, or a clearly marked placeholder panel naming the token that still needs
 * content. Placeholders are deliberately visible rather than a broken <img>, and every token is
 * listed in CONTENT_TODO.md.
 */
export function Slot({
  slot,
  sizes,
  priority,
  dark,
}: {
  slot: ImageSlot;
  sizes?: string;
  priority?: boolean;
  dark?: boolean;
}) {
  if (!slot.src || !slot.width || !slot.height) {
    return (
      <span className={dark ? "fv-slot fv-slot--dark" : "fv-slot"}>
        <span>{slot.token}</span>
      </span>
    );
  }

  return (
    <Image
      src={slot.src}
      alt={slot.alt ?? ""}
      width={slot.width}
      height={slot.height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized
    />
  );
}
