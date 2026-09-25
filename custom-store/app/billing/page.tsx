import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { count, day, money } from "@/lib/format";
import { PageHead, Shell } from "@/components/Shell";
import { PayButton } from "@/components/PayButton";

export default async function Billing() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }

  const { account, invoices, payments, stores } = data;
  const due = invoices.filter((i) => i.status === "sent");
  const paid = invoices.filter((i) => i.status === "paid");
  const totalBought = paid.reduce((sum, i) => sum + i.credits, 0);

  return (
    <Shell active="/billing" account={account}>
      <PageHead
        title="Billing"
        subtitle="Credit top-ups agreed with us appear here. Paying adds them to your store straight away."
      />

      {!payments.enabled ? (
        <p className="notice warn">
          Card payments are briefly unavailable. Your invoices are safe — try again shortly.
        </p>
      ) : null}

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat">
          <span className="stat-label">Awaiting payment</span>
          <b className="stat-value">{due.length}</b>
          <span className="stat-hint">
            {due.length ? due.map((i) => money(i.amount, i.currency)).join(" · ") : "nothing due"}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Credits bought</span>
          <b className="stat-value">{count(totalBought)}</b>
          <span className="stat-hint">across {paid.length} {paid.length === 1 ? "invoice" : "invoices"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Stores billed</span>
          <b className="stat-value">{count(stores.length)}</b>
          <span className="stat-hint">connected to this account</span>
        </div>
      </div>

      {due.length > 0 ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head"><h2>{due.length === 1 ? "Invoice to pay" : "Invoices to pay"}</h2></div>
          <div className="card-body flush">
            {due.map((invoice) => (
              <div className="row-item due" key={invoice.id}>
                <div className="row-main">
                  <b>{count(invoice.credits)} try-on credits</b>
                  <p>{invoice.description || "Credit top-up"} · issued {day(invoice.createdAt)}</p>
                </div>
                <span className="row-amount">{money(invoice.amount, invoice.currency)}</span>
                {payments.enabled ? (
                  <PayButton
                    invoiceId={invoice.id}
                    storeName={account.email}
                    contactEmail={account.isPlaceholder ? undefined : account.email}
                    label={`Pay ${money(invoice.amount, invoice.currency)}`}
                  />
                ) : (
                  <span className="badge warn">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-body">
            <h2 className="display" style={{ fontSize: 19, marginBottom: 6 }}>Nothing to pay</h2>
            <p className="sub">
              When we agree a credit top-up with you, the invoice appears here and you can pay it in
              a couple of taps. Credits land on your store the moment it goes through.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>History</h2></div>
        <div className="card-body flush">
          {paid.length === 0 ? (
            <p className="empty">Nothing bought yet.</p>
          ) : (
            paid.map((invoice) => (
              <div className="row-item" key={invoice.id}>
                <div className="row-main">
                  <b>{count(invoice.credits)} try-on credits</b>
                  <p>{invoice.description || "Credit top-up"} · paid {day(invoice.paidAt)}</p>
                </div>
                <span className="row-amount">{money(invoice.amount, invoice.currency)}</span>
                <span className="badge good">Paid</span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="hint">
        Credits bought here are added to the current billing cycle and are used after your plan&apos;s
        own allowance. They do not carry over when the cycle resets.
      </p>
    </Shell>
  );
}
