import type { ComponentType } from "react";
import * as history from "./a-short-history-of-virtual-try-on";
import * as evaluation from "./evaluating-texture-fidelity-in-vto";
import * as speed from "./fast-enough-for-a-storefront";
import * as pose from "./pose-consistency-in-garment-generation";
import * as data from "./where-training-data-comes-from";
import * as fabric from "./why-fabric-is-harder-than-pixels";

export type PostBody = { Body: ComponentType; refs: string[]; toc: { id: string; label: string }[] };

export const POST_BODIES: Record<string, PostBody> = {
  "a-short-history-of-virtual-try-on": history,
  "why-fabric-is-harder-than-pixels": fabric,
  "evaluating-texture-fidelity-in-vto": evaluation,
  "pose-consistency-in-garment-generation": pose,
  "fast-enough-for-a-storefront": speed,
  "where-training-data-comes-from": data,
};
