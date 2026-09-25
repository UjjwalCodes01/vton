import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { signOut } from "./actions";
import { PayButton } from "@/components/PayButton";
import { redirect } from "next/navigation";

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };
const money = (amount: number, currency: string) =>
  `${SYMBOL[currency] ?? ""}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
const count = (n: number) => n.toLocaleString("en-US");
const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default async function PortalHome() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    // An expired session is the ordinary case; anything else is worth showing.
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }

  const { store, invoices, payments } = data;
  const remaining = Math.max(0, store.allowance - store.used);
  const usedPct = store.allowance > 0 ? Math.min(100, Math.round((store.used / store.allowance) * 100)) : 0;
  const due = invoices.filter((i) => i.status === "sent");
  const paid = invoices.filter((i) => i.status === "paid");

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <span className="brand">
            <span className="brand-mark">C</span>
            <span>Clothsy AI</span>
            <em>billing</em>
          </span>
          <span className="who">
            <span className="mono">{store.shop}</span>
            <form action={signOut}>
              <button className="link-btn" type="submit">Sign out</button>
            </form>
          </span>
        </div>
      </header>

      <main className="page">
        <div className="page-head">
          <h1>{store.name}</h1>
          <p>
            On the {store.plan} plan, which includes {count(store.planCredits)} try-ons a month.
          </p>
        </div>

        {store.isSuspended ? (
          <p className="notice bad">
            Try-on is paused on this store. Paying an invoice will still add credits, but get in
            touch so we can switch it back on.
          </p>
        ) : null}

        <section className="card">
          <div className="card-head">
            <h2>Try-ons left this cycle</h2>
            <span className="badge">{usedPct}% used</span>
          </div>
          <div className="balance">
            <b>{count(remaining)}</b>
            <span>of {count(store.allowance)}</span>
          </div>
          <div className={`meter${remaining === 0 ? " full" : ""}`}>
            <span style={{ width: `${usedPct}%` }} />
          </div>
          <dl className="split">
            <div>
              <dt>Plan allowance</dt>
              <dd>{count(store.planCredits)}</dd>
            </div>
            <div>
              <dt>Bought this cycle</dt>
              <dd>{count(store.topUpCredits)}</dd>
            </div>
            <div>
              <dt>Used</dt>
              <dd>{count(store.used)}</dd>
            </div>
          </dl>
          <p className="hint">
            Credits you buy are added to this cycle&apos;s allowance and are used after your plan&apos;s
            own credits. They do not carry over when the cycle resets.
          </p>
        </section>

        {due.length > 0 ? (
          <section>
            <h2 style={{ margin: "26px 0 12px" }}>
              {due.length === 1 ? "Invoice to pay" : "Invoices to pay"}
            </h2>
            {!payments.enabled ? (
              <p className="notice warn">
                Card payments are briefly unavailable. Your invoice is safe — try again shortly.
              </p>
            ) : null}
            {due.map((invoice) => (
              <div className="invoice due" key={invoice.id}>
                <div className="invoice-main">
                  <b>{count(invoice.credits)} try-on credits</b>
                  <p>
                    {invoice.description || "Credit top-up"} · issued {day(invoice.createdAt)}
                  </p>
                </div>
                <span className="invoice-amount">{money(invoice.amount, invoice.currency)}</span>
                {payments.enabled ? (
                  <PayButton
                    invoiceId={invoice.id}
                    storeName={store.shop}
                    label={`Pay ${money(invoice.amount, invoice.currency)}`}
                  />
                ) : (
                  <span className="badge warn">Unavailable</span>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="card">
            <h2>Nothing to pay</h2>
            <p className="sub" style={{ marginTop: 6 }}>
              When we agree a credit top-up with you, the invoice appears here and you can pay it in
              a couple of taps.
            </p>
          </section>
        )}

        {paid.length > 0 ? (
          <section>
            <h2 style={{ margin: "26px 0 12px" }}>Paid</h2>
            {paid.map((invoice) => (
              <div className="invoice" key={invoice.id}>
                <div className="invoice-main">
                  <b>{count(invoice.credits)} try-on credits</b>
                  <p>
                    {invoice.description || "Credit top-up"} · paid {day(invoice.paidAt)}
                  </p>
                </div>
                <span className="invoice-amount">{money(invoice.amount, invoice.currency)}</span>
                <span className="badge good">Paid</span>
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}
