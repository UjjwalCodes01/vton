/** Decorative arrow used inside buttons and links. The motion engine nudges it toward the cursor. */
export function Arrow({ dir = "right" }: { dir?: "right" | "up" }) {
  return (
    <span className={dir === "up" ? "fv-arrow fv-arrow--up" : "fv-arrow"} aria-hidden="true">
      {dir === "up" ? "↗" : "→"}
    </span>
  );
}
