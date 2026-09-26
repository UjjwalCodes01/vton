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
    if (error instanceof ApiError && error.status === 401) redirect("/session/expired");
    throw error;
  }

  const { account, stores, invoices, stats } = data;
  const due = invoices.filter((i) => i.status === "sent");

  const allowance = stores.reduce((sum, s) => sum + s.allowance, 0);
  const used = stores.reduce((sum, s) => sum + s.used, 0);
  const remaining = Math.max(0, allowance - used);
  const usedPct = percent(used, allowance);
  const firstName = account.name?.split(" ")[0];

  return (
    <Shell active="/" account={account}>
      <PageHead
        title={firstName ? `Good to see you, ${firstName}` : "Overview"}
        subtitle="Your try-on credits, connected stores and recent activity."
      />

      {due.length > 0 ? (
        <div className="notice info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span>
            {due.length === 1 ? "An invoice is waiting" : `${due.length} invoices are waiting`} —{" "}
            {due.map((i) => money(i.amount, i.currency)).join(" · ")}.
          </span>
          <Link className="btn sm violet" href="/billing">Pay now</Link>
        </div>
      ) : null}

      {stores.length === 0 ? (
        <section className="figure">
          <span className="figure-label">Account credits</span>
          <b className="figure-value display">{count(account.credits)}</b>
          <p className="figure-note">
            Yours to spend in the Playground. Connect a store to bring its try-ons, allowance and
            invoices in here too.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <Link className="btn violet" href="/playground">Open the Playground</Link>
            <Link className="btn ghost" href="/settings">Connect a store</Link>
          </div>
        </section>
      ) : (
        <>
          <section className="figure">
            <span className="figure-label">Try-ons left this cycle</span>
            <b className="figure-value display">{count(remaining)}</b>
            <div className={`bar${remaining === 0 ? " full" : ""}`}><span style={{ width: `${usedPct}%` }} /></div>
            <p className="figure-note">
              {count(used)} of {count(allowance)} used across {stores.length}{" "}
              {stores.length === 1 ? "store" : "stores"}.
            </p>

            <dl className="rule-row">
              <div>
                <dt>Try-ons</dt>
                <dd>{count(stats.tryOnsThisMonth)}</dd>
                <small>last 30 days</small>
              </div>
              <div>
                <dt>Account credits</dt>
                <dd>{count(account.credits)}</dd>
                <small>for the Playground</small>
              </div>
              <div>
                <dt>Stores</dt>
                <dd>{count(stores.length)}</dd>
                <small>connected</small>
              </div>
              <div>
                <dt>Invoices</dt>
                <dd>{count(invoices.length)}</dd>
                <small>{due.length ? `${due.length} to pay` : "all settled"}</small>
              </div>
            </dl>
          </section>

          <section className="block">
            <div className="block-head">
              <h2>Your stores</h2>
              <Link className="sub" href="/settings">Manage →</Link>
            </div>
            {stores.map((store) => (
              <div className="row-item" key={store.shop}>
                <div className="row-main">
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
                  <span className="sub nowrap">{count(store.used)} / {count(store.allowance)} used</span>
                </div>
              </div>
            ))}
          </section>

          {invoices.length > 0 ? (
            <section className="block">
              <div className="block-head">
                <h2>Recent billing</h2>
                <Link className="sub" href="/billing">All invoices →</Link>
              </div>
              {invoices.slice(0, 3).map((invoice) => (
                <div className={`row-item${invoice.status === "sent" ? " due" : ""}`} key={invoice.id}>
                  <div className="row-main">
                    <span>
                      <b>{count(invoice.credits)} credits</b>
                      <p>{invoice.description || "Credit top-up"} · {timeAgo(invoice.createdAt)}</p>
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="row-amount">{money(invoice.amount, invoice.currency)}</span>
                    <span className={`badge ${invoice.status === "paid" ? "good" : "violet"}`}>
                      {invoice.status === "paid" ? "Paid" : "Due"}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </Shell>
  );
}
