"use client";

import { useState } from "react";

export function StoreConnect() {
  const [platform, setPlatform] = useState("shopify");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ code: string; adminUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/store-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform, storeUrl: url }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not start connection.");
      setResult(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start connection."); }
    finally { setBusy(false); }
  }

  return <div className="card" style={{ marginBottom: 14 }}><div className="card-head"><h2>Connect another store</h2></div><div className="card-body">
    <p className="sub">Enter your store URL. Then approve the connection in the store&apos;s own admin. This proves you manage the store.</p>
    <form onSubmit={start} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
      <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Store platform" style={{ padding: 10 }}>
        <option value="shopify">Shopify</option><option value="woocommerce">WooCommerce</option>
      </select>
      <input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder={platform === "shopify" ? "https://your-store.myshopify.com" : "https://your-store.com"} aria-label="Store URL" style={{ padding: 10, minWidth: 270, flex: 1 }} />
      <button type="submit" className="btn violet" disabled={busy}>Start connection</button>
    </form>
    {error ? <p role="alert" className="notice" style={{ marginTop: 12 }}>{error}</p> : null}
    {result ? <div className="notice info" style={{ marginTop: 16 }}>
      <p>Your one-time code (expires in 15 minutes): <b className="mono">{result.code}</b></p>
      <p>Open <a href={result.adminUrl} target="_blank" rel="noopener noreferrer">your store admin</a>{platform === "shopify" ? ", install Clothsy AI if needed, then open Clothsy AI → Connect platform account" : ", install and connect the Clothsy AI plugin if needed, then open WooCommerce → Clothsy AI"}, and paste this code.</p>
      <p>After approval, refresh this page to see the store.</p>
    </div> : null}
  </div></div>;
}
