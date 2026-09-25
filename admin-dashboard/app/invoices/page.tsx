import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateOnly, number } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { InvoiceRowActions } from "@/components/InvoiceForm";
import { Badge, Card, Empty, PageHead, Stat } from "@/components/ui";

interface Invoice {
  id: string; shop: string; credits: number; amount: number; currency: string; status: string;
  description: string | null; internalNote: string | null; createdBy: string;
  createdAt: string; paidAt: string | null;
}

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };
const money = (amount: number, currency: string) =>
  `${SYMBOL[currency] ?? ""}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
const TONE: Record<string, string> = { paid: "good", sent: "accent", draft: "", cancelled: "warn" };

export default async function InvoicesPage() {
  const session = await requireSession();
  const { invoices, paymentsEnabled } = await api.invoices<{ invoices: Invoice[]; paymentsEnabled: boolean }>();

  // Totals are per currency: adding rupees to dollars would be a lie.
  const collected = new Map<string, number>();
  const outstanding = new Map<string, number>();
  let creditsSold = 0;

  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      collected.set(invoice.currency, (collected.get(invoice.currency) ?? 0) + invoice.amount);
      creditsSold += invoice.credits;
    } else if (invoice.status === "sent") {
      outstanding.set(invoice.currency, (outstanding.get(invoice.currency) ?? 0) + invoice.amount);
    }
  }

  const join = (totals: Map<string, number>) =>
    totals.size ? [...totals].map(([currency, amount]) => money(amount, currency)).join(" · ") : "—";

  return (
    <Shell email={session.email} active="/invoices">
      <PageHead
        title="Invoices"
        subtitle="Credit sales across every store, drafted here and paid in the merchant's portal."
        actions={paymentsEnabled ? <Badge tone="good">Razorpay connected</Badge> : <Badge tone="warn">Razorpay not configured</Badge>}
      />

      <div className="stat-grid">
        <Stat label="Collected" value={join(collected)} hint="paid invoices" tone="good" />
        <Stat label="Awaiting payment" value={join(outstanding)} hint="sent, not yet paid" tone={outstanding.size ? "warn" : ""} />
        <Stat label="Credits sold" value={number(creditsSold)} hint="try-ons granted" />
        <Stat label="Invoices" value={number(invoices.length)} hint="all time" />
      </div>

      <Card flush>
        {invoices.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Raised</th><th>Store</th><th>Credits</th><th>Amount</th><th>Status</th><th>Description</th><th>By</th><th /></tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="nowrap sub">{dateOnly(invoice.createdAt)}</td>
                    <td><Link className="mono" href={`/stores/${encodeURIComponent(invoice.shop)}`}>{invoice.shop}</Link></td>
                    <td className="nowrap">{number(invoice.credits)}</td>
                    <td className="nowrap strong">{money(invoice.amount, invoice.currency)}</td>
                    <td><Badge tone={TONE[invoice.status] ?? ""}>{invoice.status}</Badge></td>
                    <td className="sub clip">
                      {invoice.description || "—"}
                      {invoice.internalNote ? <div className="sub">note: {invoice.internalNote}</div> : null}
                    </td>
                    <td className="sub clip">{invoice.createdBy.replace(/^dashboard:/, "")}</td>
                    <td className="right"><InvoiceRowActions id={invoice.id} status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No invoices yet. Open a store and use “Sell credits” to raise the first one.</Empty>
        )}
      </Card>
    </Shell>
  );
}
