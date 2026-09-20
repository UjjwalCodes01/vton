"use client";

import { useEffect } from "react";
import { initMotion } from "../_motion/initMotion";

/** Attaches the page's motion engine (reveals, scroll state, pointer effects). Renders nothing. */
export default function Motion() {
  useEffect(() => initMotion(document), []);
  return null;
}
