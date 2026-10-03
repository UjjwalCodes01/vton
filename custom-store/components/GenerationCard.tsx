"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Generations } from "@/lib/api";

type Generation = Generations["generations"][number];

/**
 * One try-on on the Generations page, with its delete button. Deleting asks
 * first, removes the try-on (and any shared-look copy) for good, then reloads
 * the list so the counts stay right.
 */
export function GenerationCard({ gen, when }: { gen: Generation; when: string }) {
  const router = useRouter();
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = gen.productTitle || "Untitled product";
  const canDelete = gen.status !== "pending";

  async function remove() {
    if (!window.confirm(`Delete the "${title}" try-on? The image and any shared link to it are removed for good.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/generations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: gen.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete this try-on.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this try-on.");
      setBusy(false);
    }
  }

  const fallback = gen.status === "failed" ? "Did not finish"
    : gen.status === "pending" ? "Still running"
    : gen.imageExpired || broken ? "Image expired (kept for 24 hours)"
    : "No image";

  return (
    <article className="gen" aria-busy={busy}>
      <div className="gen-frame">
        {gen.imageUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="gen-img" src={gen.imageUrl} alt={title} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="gen-fallback">{fallback}</div>
        )}
        {canDelete ? (
          <button type="button" className="gen-delete" onClick={remove} disabled={busy} aria-label={`Delete the ${title} try-on`} title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="gen-meta">
        <b>{title}</b>
        <span>
          {when}
          {gen.seconds ? ` · ${gen.seconds}s` : ""}
          {gen.rating === "up" ? " · 👍" : gen.rating === "down" ? " · 👎" : ""}
        </span>
        {error ? <span role="alert" className="gen-error">{error}</span> : null}
      </div>
    </article>
  );
}
