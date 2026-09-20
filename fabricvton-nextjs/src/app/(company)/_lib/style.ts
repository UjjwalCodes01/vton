import type { CSSProperties } from "react";

/** Inline stagger delay for `data-reveal` elements: `style={delay(80)}`. */
export const delay = (ms: number): CSSProperties => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Set arbitrary CSS custom properties from a typed object. */
export const cssVars = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties;
