"use client";

import { useState } from "react";
import type { Faq as FaqItem } from "../lib/content";
import Faq from "./Faq";

export type FaqGroup = { id: string; label: string; items: FaqItem[] };

/** Groups a longer FAQ into a few calm tabs, so the page never shows a wall of questions. */
export default function FaqTabs({ groups }: { groups: FaqGroup[] }) {
  const [active, setActive] = useState(groups[0].id);
  const group = groups.find((g) => g.id === active) ?? groups[0];

  return (
    <div className="fq-tabs">
      <div className="seg" role="group" aria-label="Question topics">
        {groups.map((g) => (
          <button key={g.id} type="button" aria-pressed={g.id === active} onClick={() => setActive(g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <Faq key={group.id} items={group.items} />
    </div>
  );
}
