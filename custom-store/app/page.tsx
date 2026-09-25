import Link from "next/link";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { count, money, percent, timeAgo } from "@/lib/format";
import { PageHead, Shell } from "@/components/Shell";

export default async function Overview() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }

  const { account, stores, invoices, stats } = data;
  const due = invoices.filter((i) => i.status === "sent");

  // Across every connected store, so one number answers "can I keep going?".
  const allowance = stores.reduce((sum, s) => sum + s.allowance, 0);
  const used = stores.reduce((sum, s) => sum + s.used, 0);
  const remaining = Math.max(0, allowance - used);
  const usedPct = percent(used, allowance);

  return (
    <Shell active="/" account={account}>
      <PageHead
        title={account.name ? `Welcome back, ${account.name.split(" ")[0]}` : "Overview"}
        subtitle="Your try-on credits, connected stores and recent activity."
      />

      {due.length > 0 ? (
        <div className="notice info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <span>
            You have {due.length === 1 ? "an invoice" : `${due.length} invoices`} waiting —{" "}
            {due.map((i) => money(i.amount, i.currency)).join(" · ")}.
          </span>
          <Link className="btn sm" href="/billing">Pay now</Link>
        </div>
      ) : null}

      {stores.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <h2 className="display" style={{ fontSize: 22, marginBottom: 8 }}>Connect your first store</h2>
            <p className="sub" style={{ maxWidth: 420, margin: "0 auto 20px" }}>
              Your account is ready. Connect a Shopify store to see its try-ons, allowance and
              invoices here.
            </p>
            <Link className="btn" href="/settings">Connect a store</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid cols-2" style={{ marginBottom: 14 }}>
            <div className="hero">
              <h2>Try-ons left this cycle</h2>
              <b>{count(remaining)}</b>
              <p>{count(used)} of {count(allowance)} used across {stores.length} {stores.length === 1 ? "store" : "stores"}</p>
              <div className="meter on-hero"><span style={{ width: `${usedPct}%` }} /></div>
              {due.length > 0 ? <Link className="btn light" href="/billing">Top up credits</Link> : null}
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="stat">
                <span className="stat-label">Try-ons</span>
                <b className="stat-value">{count(stats.tryOnsThisMonth)}</b>
                <span className="stat-hint">last 30 days</span>
              </div>
              <div className="stat">
                <span className="stat-label">Account credits</span>
                <b className="stat-value">{count(account.credits)}</b>
                <span className="stat-hint">for the Playground</span>
              </div>
              <div className="stat">
                <span className="stat-label">Stores</span>
                <b className="stat-value">{count(stores.length)}</b>
                <span className="stat-hint">connected</span>
              </div>
              <div className="stat">
                <span className="stat-label">Invoices</span>
                <b className="stat-value">{count(invoices.length)}</b>
                <span className="stat-hint">{due.length ? `${due.length} to pay` : "all settled"}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Your stores</h2>
              <Link className="btn ghost sm" href="/settings">Manage</Link>
            </div>
            <div className="card-body flush">
              {stores.map((store) => (
                <div className="row-item" key={store.shop}>
                  <div className="row-main" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="store-logo">{store.name.charAt(0).toUpperCase()}</span>
                    <span>
                      <b>{store.name}</b>
                      <p className="mono">{store.shop}</p>
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge violet">{store.plan}</span>
                    {store.isSuspended ? <span className="badge bad">paused</span> : null}
                    {!store.isEnabled ? <span className="badge warn">try-on off</span> : null}
                    <span className="sub nowrap">
                      {count(store.used)} / {count(store.allowance)} used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invoices.length > 0 ? (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-head">
                <h2>Recent billing</h2>
                <Link className="btn ghost sm" href="/billing">All invoices</Link>
              </div>
              <div className="card-body flush">
                {invoices.slice(0, 3).map((invoice) => (
                  <div className={`row-item${invoice.status === "sent" ? " due" : ""}`} key={invoice.id}>
                    <div className="row-main">
                      <b>{count(invoice.credits)} credits</b>
                      <p>{invoice.description || "Credit top-up"} · {timeAgo(invoice.createdAt)}</p>
                    </div>
                    <span className="row-amount">{money(invoice.amount, invoice.currency)}</span>
                    <span className={`badge ${invoice.status === "paid" ? "good" : "violet"}`}>
                      {invoice.status === "paid" ? "Paid" : "Due"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Shell>
  );
}
