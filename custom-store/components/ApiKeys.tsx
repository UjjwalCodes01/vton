"use client";

import { useState } from "react";
import type { ApiKeyData } from "@/lib/api";

/** Keep in step with FREE_API_CREDITS on the backend. */
const FREE_CREDITS = 20;

export function ApiKeys({ initial }: { initial: ApiKeyData }) {
  const [data, setData] = useState(initial);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("Production");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // Only keys the customer created count towards their one key; keys we issue sit alongside it.
  const activeKey = data.keys.find((key) => !key.revokedAt && key.issuedBy !== "admin");

  async function change(action: "create" | "revoke", id?: string) {
    setBusy(true); setError(""); setSecret(""); setNotice("");
    try {
      const response = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id, name }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Request failed.");
      if (action === "create") {
        setSecret(result.token);
        const granted = Number(result.freeCreditsGranted) || 0;
        if (granted) setNotice(`${granted} free credits added to this account.`);
        setData((old) => ({ ...old, credits: old.credits + granted, keys: [result.key, ...old.keys] }));
      } else setData(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head"><h2>Account API keys</h2><span className="badge violet">{data.credits} credits</span></div>
      <div className="card-body">
        <p className="sub">
          One API key per account. Your first key comes with {FREE_CREDITS} free try-on credits, once per
          account. One successful try-on costs one credit; a failed generation is refunded.
        </p>
        {activeKey ? (
          <p className="sub" style={{ marginTop: 12 }}>
            To replace your key — if it is lost or may have leaked — revoke it below, then create a new one.
            The free credits are not given again.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <input aria-label="Key name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }} />
            <button type="button" className="btn violet" disabled={busy} onClick={() => change("create")}>Create API key</button>
          </div>
        )}
        {notice ? <p className="notice good" style={{ marginTop: 16 }}>{notice}</p> : null}
        {secret ? <div className="notice info" style={{ marginTop: 16, overflowWrap: "anywhere" }}><b>Copy this key now. It will not be shown again.</b><p className="mono">{secret}</p></div> : null}
        {error ? <p role="alert" className="notice" style={{ marginTop: 12 }}>{error}</p> : null}
      </div>
      <div className="card-body flush">
        {data.keys.length ? data.keys.map((key) => <div className="row-item" key={key.id}>
          <span>
            <b>{key.name}</b>
            <p className="mono">{key.prefix}… · {key.revokedAt ? "Revoked" : "Active"}</p>
            {key.issuedBy === "admin" ? (
              <p className="sub">
                Issued by Clothsy AI · {typeof key.credits === "number" ? `${key.credits.toLocaleString("en-US")} try-ons left on this key` : "uses account credits"}
              </p>
            ) : null}
          </span>
          {!key.revokedAt ? <button type="button" className="btn sm ghost" disabled={busy} onClick={() => change("revoke", key.id)}>Revoke</button> : null}
        </div>) : <p className="empty">No API keys yet.</p>}
      </div>
    </div>
    <div className="card"><div className="card-head"><h2>Recent API requests</h2></div><div className="card-body flush">
      {data.runs.length ? data.runs.map((run) => <div className="row-item" key={run.id}><span className="mono">{run.id}</span><span className="badge">{run.state}</span></div>) : <p className="empty">No API requests yet.</p>}
    </div></div>
  </>;
}
