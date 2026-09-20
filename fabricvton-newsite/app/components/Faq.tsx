"use client";

import { useId, useState } from "react";
import type { Faq as FaqItem } from "../lib/content";
import { ChevronDown } from "./icons";

/** A quiet accordion: one question open at a time, the answer eases open, the chevron turns. */
export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();

  return (
    <div className="fq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="fq-item" data-open={isOpen} key={item.q}>
            <h3>
              <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                {item.q}
                <ChevronDown />
              </button>
            </h3>
            <div className="fq-panel" id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}>
              <div>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
