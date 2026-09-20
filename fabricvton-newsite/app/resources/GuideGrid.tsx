"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Bag, Hanger, Lock, Photo, Wand } from "../components/icons";
import type { Guide } from "../lib/content";

const FILTERS = ["All", "Shoppers", "Stores"] as const;
type Filter = (typeof FILTERS)[number];

const COVER: Record<string, ReactNode> = {
  "take-a-photo-that-works": <Photo />,
  "what-happens-to-your-photo": <Lock />,
  "add-clothsy-to-shopify": <Bag />,
  "add-clothsy-to-woocommerce": <Hanger />,
  "plans-and-try-on-allowance": <Wand />,
};

/** Category switching for the guides: cards ease in again, one after another, whenever the filter changes. */
export default function GuideGrid({ guides }: { guides: Guide[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const shown = guides.filter((g) => filter === "All" || g.audience === filter);

  return (
    <>
      <div className="seg guide-filter" role="group" aria-label="Filter guides">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "All" ? "All guides" : `For ${f.toLowerCase()}`}
          </button>
        ))}
      </div>

      <div className="post-grid" key={filter}>
        {shown.map((guide, i) => (
          <Link className="post-card guide-card" key={guide.slug} href={`/resources/${guide.slug}`} style={{ "--d": `${i * 70}ms` } as CSSProperties}>
            <span className="post-cover" aria-hidden="true">
              {COVER[guide.slug] ?? <Wand />}
            </span>
            <span className="post-body">
              <span className="tag">{guide.audience}</span>
              <h3>{guide.title}</h3>
              <p>{guide.summary}</p>
              <span className="link-arrow">
                Read the guide
                <span>
                  <ArrowRight />
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "guide" : "guides"}.
      </p>
    </>
  );
}
