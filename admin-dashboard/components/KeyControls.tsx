"use client";

// Per-key controls: change an issued key's try-ons, or revoke any active key.

import { useActionState } from "react";
import { adjustApiKeyCredits, renameApiKey, revokeApiKey } from "@/app/actions";

export function KeyCredits({ keyId }: { keyId: string }) {
  const [state, action, pending] = useActionState(adjustApiKeyCredits, {});
  return (
    <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
      <input type="hidden" name="keyId" value={keyId} />
      <input
        className="input"
        type="number"
        name="amount"
        step="1"
        min="-1000000"
        max="1000000"
        placeholder="+ / − try-ons"
        required
        aria-label="Try-ons to add (negative to remove)"
        style={{ width: 120 }}
      />
      <button className="btn sm" type="submit" disabled={pending}>Apply</button>
      {state.error ? <span role="alert" className="sub" style={{ color: "var(--bad, #b42318)" }}>{state.error}</span> : null}
      {state.message ? <span role="status" className="sub">{state.message}</span> : null}
    </form>
  );
}

export function KeyRevoke({ keyId, label }: { keyId: string; label: string }) {
  const [state, action, pending] = useActionState(revokeApiKey, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Revoke ${label}? Requests with it stop working immediately.`)) event.preventDefault();
      }}
      style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
    >
      <input type="hidden" name="keyId" value={keyId} />
      <button className="btn sm danger" type="submit" disabled={pending}>Revoke</button>
      {state.error ? <span role="alert" className="sub" style={{ color: "var(--bad, #b42318)" }}>{state.error}</span> : null}
    </form>
  );
}

export function KeyRename({ keyId, name, note }: { keyId: string; name: string; note: string | null }) {
  const [state, action, pending] = useActionState(renameApiKey, {});
  return (
    <details>
      <summary className="sub" style={{ cursor: "pointer" }}>Edit name / note</summary>
      <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <input type="hidden" name="keyId" value={keyId} />
        <input className="input" name="name" defaultValue={name} maxLength={60} required aria-label="Key name" style={{ width: 180 }} />
        <input className="input" name="note" defaultValue={note ?? ""} maxLength={500} placeholder="Note" aria-label="Note" style={{ width: 180 }} />
        <button className="btn sm" type="submit" disabled={pending}>Save</button>
        {state.error ? <span role="alert" className="sub" style={{ color: "var(--bad, #b42318)" }}>{state.error}</span> : null}
        {state.message ? <span role="status" className="sub">{state.message}</span> : null}
      </form>
    </details>
  );
}
