"use client";

// Issue an API key with its own try-on allowance. The key is shown once, here,
// right after it's created — the backend keeps only a hash, so it can't be
// shown again. Copy it now and hand it over.

import { useActionState, useState } from "react";
import { issueApiKey } from "@/app/actions";

export function KeyIssue() {
  const [state, action, pending] = useActionState(issueApiKey, {});
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={action} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input className="input" type="email" name="email" placeholder="Customer email (optional)" style={{ width: 230 }} />
        <input className="input" name="name" maxLength={60} placeholder="Key name (e.g. Acme production)" style={{ width: 230 }} />
        <input className="input" type="number" name="credits" min="1" max="1000000" step="1" placeholder="Try-ons" required style={{ width: 110 }} />
        <input className="input" name="note" maxLength={500} placeholder="Note (deal, invoice…)" style={{ width: 200 }} />
        <button className="btn accent" type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate key"}
        </button>
      </form>
      {state.error ? <p role="alert" className="sub" style={{ color: "var(--bad, #b42318)", marginTop: 10 }}>{state.error}</p> : null}
      {state.issuedKey ? (
        <div role="status" style={{ marginTop: 14, padding: 14, borderRadius: 12, border: "1px solid var(--line, #e5e5e5)", background: "var(--soft, #faf8ff)" }}>
          <b>{state.message}</b>
          <p className="sub" style={{ margin: "6px 0 8px" }}>
            Copy this key now — it won&apos;t be shown again. Send it to the customer over a private channel.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code className="mono" style={{ overflowWrap: "anywhere", padding: "6px 8px", background: "#fff", borderRadius: 8, border: "1px solid var(--line, #e5e5e5)" }}>
              {state.issuedKey}
            </code>
            <button
              className="btn sm"
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.issuedKey!);
                  setCopied(true);
                } catch {
                  // Clipboard blocked; the key is still selectable.
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
