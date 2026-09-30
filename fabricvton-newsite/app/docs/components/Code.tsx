"use client";

import { useState } from "react";

/** A code sample with a copy button. `title` is the file name or language shown above it. */
export function Code({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the code is still selectable.
    }
  }

  return (
    <figure className="doc-code">
      <figcaption>
        <span>{title || " "}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

/** The same step in several languages, one tab each. */
export function CodeTabs({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="doc-tabs">
      <div role="tablist" aria-label="Language">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Code code={tabs[active].code} title={tabs[active].label} />
    </div>
  );
}
