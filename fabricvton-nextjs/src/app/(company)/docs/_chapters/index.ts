import type { ComponentType } from "react";
import type { TocItem } from "../_components/DocsLayout";
import * as summary from "./summary";
import * as problem from "./problem";
import * as imageTryOn from "./image-try-on";
import * as videoAndLive from "./video-and-live";
import * as approach from "./approach";
import * as videoModels from "./video-and-live-models";
import * as roadmap from "./roadmap";
import * as funding from "./funding";
import * as outputs from "./outputs";
import * as responsible from "./responsible-use";
import * as glossary from "./glossary";
import * as references from "./references";

export type ChapterBody = { Body: ComponentType; toc: TocItem[]; sources: number[] };

/** Chapter bodies by slug. Metadata (titles, order, groups) lives in ../_data/chapters.ts. */
export const CHAPTER_BODIES: Record<string, ChapterBody> = {
  summary,
  problem,
  "image-try-on": imageTryOn,
  "video-and-live": videoAndLive,
  approach,
  "video-and-live-models": videoModels,
  roadmap,
  funding,
  outputs,
  "responsible-use": responsible,
  glossary,
  references,
};
