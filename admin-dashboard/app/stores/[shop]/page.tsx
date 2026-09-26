import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateOnly, dateTime, number, percent, timeAgo } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { ActionForm } from "@/components/ActionForm";
import { InvoiceForm, InvoiceRowActions } from "@/components/InvoiceForm";
import { Badge, BarChart, Card, Empty, PageHead, PlatformBadge, Stat } from "@/components/ui";

interface StoreDetail {
  store: {
    shop: string; platform: string; storeName: string | null; siteUrl: string | null; adminEmail: string | null;
    plan: string; planLabel: string; planCredits: number; monthlyCredits: number; creditsUsed: number;
    customCredits: number | null; customPlanLabel: string | null; customNote: string | null;
    customSetBy: string | null; customSetAt: string | null;
    isEnabled: boolean; isSuspended: boolean; suspendReason: string | null;
    connectionStatus: string | null; pluginVersion: string | null;
    installedAt: string; billingCycleStart: string;
  };
  subscription: { id: string; status: string } | null;
  recentTryOns: { id: string; status: string; productTitle: string | null; createdAt: string; processingMs: number | null; errorCode: string | null; rating: string | null }[];
  leadCount: number;
  looks: number;
  usage: { date: string; tryOnsCompleted: number }[];
  audit: { id: string; action: string; adminShop: string; createdAt: string }[];
}

const PLANS = ["free", "starter", "growth", "pro", "scale"];

interface Invoice {
  id: string; credits: number; amount: number; currency: string; status: string;
  description: string | null; internalNote: string | null; createdAt: string; paidAt: string | null;
}

const SYMBOL: Record<string, string> = { INR: "\u20b9", USD: "$" };
const money = (amount: number, currency: string) =>
  `${SYMBOL[currency] ?? ""}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
const TONE: Record<string, string> = { paid: "good", sent: "accent", draft: "", cancelled: "warn" };

export default async function StorePage({ params }: { params: Promise<{ shop: string }> }) {
  const session = await requireSession();
  const { shop: encoded } = await params;
  const shop = decodeURIComponent(encoded);
  const [data, invoiceData] = await Promise.all([
    api.store<StoreDetail>(shop),
    api.invoices<{ invoices: Invoice[]; paymentsEnabled: boolean }>(shop),
  ]);
  const s = data.store;
  const isWoo = s.platform === "woocommerce";
  const used = percent(s.creditsUsed, s.monthlyCredits);
  const resets = new Date(new Date(s.billingCycleStart).getTime() + 30 * 86_400_000);

  return (
    <Shell email={session.email} active="/stores">
      <PageHead
        title={s.storeName || s.shop}
        subtitle={s.shop}
        actions={<Link className="btn ghost" href="/stores">← All stores</Link>}
      />

      <div className="badges">
        <PlatformBadge platform={s.platform} />
        {s.isSuspended ? <Badge tone="bad">suspended</Badge> : null}
        {!s.isEnabled ? <Badge tone="warn">try-on off</Badge> : null}
        {s.customCredits != null ? <Badge tone="accent">{s.customPlanLabel || "custom plan"}</Badge> : null}
      </div>

      <div className="stat-grid">
        <Stat
          label="Plan"
          value={s.planLabel}
          hint={s.customCredits != null ? `custom · the plan alone gives ${number(s.planCredits)}` : `${number(s.planCredits)} a month`}
        />
        <Stat
          label="Used this cycle"
          value={`${number(s.creditsUsed)} / ${number(s.monthlyCredits)}`}
          hint={`${used}% · resets ${dateOnly(resets)}`}
          tone={used > 90 ? "warn" : ""}
        />
        <Stat label="Leads" value={number(data.leadCount)} hint="captured before email capture was removed" />
        <Stat label="Shared looks" value={number(data.looks)} hint="live share pages" />
      </div>

      <div className="grid-2">
        <Card title="Custom plan">
          {s.customCredits != null ? (
            <div className="stack">
              <p className="sub">
                On a custom allowance of <b>{number(s.customCredits)}</b> try-ons a month
                {s.customNote ? ` — ${s.customNote}` : ""}.
              </p>
              <ActionForm
                shop={s.shop}
                action="clear_custom_plan"
                label="Remove custom plan"
                className="btn danger"
                confirm={`Put ${s.shop} back on its plan's own allowance?`}
              />
            </div>
          ) : (
            <ActionForm shop={s.shop} action="set_custom_plan" label="Give custom plan" className="btn accent">
              <div className="row">
                <label>Label<input className="input" name="label" placeholder="Enterprise" maxLength={40} /></label>
                <label>Try-ons a month<input className="input" name="credits" type="number" min={0} max={1000000} placeholder="10000" required /></label>
              </div>
              <label>
                What they pay
                <input className="input" name="note" placeholder="Invoice INV-204 · $349/mo · renews 1 Jan" maxLength={200} />
              </label>
              <p className="hint">Grants the allowance. It does not charge anyone — bill them however you agreed.</p>
            </ActionForm>
          )}
        </Card>

        <Card title="Details">
          <dl className="facts">
            <div><dt>Store key</dt><dd className="mono">{s.shop}</dd></div>
            {s.siteUrl ? <div><dt>Site</dt><dd>{/^https?:\/\//i.test(s.siteUrl) ? <a href={s.siteUrl} target="_blank" rel="noopener noreferrer">{s.siteUrl}</a> : s.siteUrl}</dd></div> : null}
            {s.adminEmail ? <div><dt>Contact</dt><dd>{s.adminEmail}</dd></div> : null}
            {isWoo ? <div><dt>Connection</dt><dd>{s.connectionStatus || "—"}{s.pluginVersion ? ` · plugin ${s.pluginVersion}` : ""}</dd></div> : null}
            <div><dt>Installed</dt><dd>{dateOnly(s.installedAt)}</dd></div>
            {s.customNote ? <div><dt>Custom deal</dt><dd>{s.customNote}</dd></div> : null}
            {s.customSetBy ? <div><dt>Granted by</dt><dd>{s.customSetBy} · {dateOnly(s.customSetAt)}</dd></div> : null}
            {s.isSuspended && s.suspendReason ? <div><dt>Suspended</dt><dd>{s.suspendReason}</dd></div> : null}
            {data.subscription ? <div><dt>Subscription</dt><dd className="mono">{data.subscription.id} · {data.subscription.status}</dd></div> : null}
          </dl>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Try-ons, last 30 days" flush>
          <BarChart rows={data.usage.map((u) => ({ label: dateOnly(u.date), value: u.tryOnsCompleted }))} height={130} />
        </Card>

        <Card title="Standard plan">
          <p className="sub" style={{ marginBottom: 10 }}>
            Moving to a standard plan sets that plan&apos;s allowance and clears any custom deal.
          </p>
          <div className="row wrap">
            {PLANS.map((plan) => (
              <ActionForm
                key={plan}
                shop={s.shop}
                action="set_plan"
                label={plan}
                className={`btn ghost sm${plan === s.plan && s.customCredits == null ? " accent" : ""}`}
                confirm={`Move ${s.shop} to ${plan}? This clears any custom plan.`}
                hidden={{ plan }}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Sell credits"
        action={invoiceData.paymentsEnabled ? null : <Badge tone="warn">Razorpay not configured</Badge>}
      >
        <p className="sub" style={{ marginBottom: 12 }}>
          Drafts stay private. Sending puts the invoice in this merchant&apos;s billing portal, where
          they pay by card or UPI; the credits land on their next page load.
        </p>
        <InvoiceForm shop={s.shop} />
      </Card>

      <Card title="Invoices" flush>
        {invoiceData.invoices.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Raised</th><th>Credits</th><th>Amount</th><th>Status</th><th>Description</th><th /></tr>
              </thead>
              <tbody>
                {invoiceData.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="nowrap sub">{dateOnly(invoice.createdAt)}</td>
                    <td className="nowrap">{invoice.credits.toLocaleString("en-US")}</td>
                    <td className="nowrap strong">{money(invoice.amount, invoice.currency)}</td>
                    <td><Badge tone={TONE[invoice.status] ?? ""}>{invoice.status}</Badge></td>
                    <td className="sub clip">
                      {invoice.description || "\u2014"}
                      {invoice.internalNote ? <div className="sub">note: {invoice.internalNote}</div> : null}
                    </td>
                    <td className="right"><InvoiceRowActions id={invoice.id} status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No invoices for this store yet.</Empty>}
      </Card>

      <Card title="Recent try-ons" flush>
        {data.recentTryOns.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Product</th><th>Result</th><th>Took</th><th>Rating</th></tr></thead>
              <tbody>
                {data.recentTryOns.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap sub">{timeAgo(t.createdAt)}</td>
                    <td>{t.productTitle || "—"}</td>
                    <td>
                      {t.status === "success" ? <Badge tone="good">success</Badge>
                        : t.status === "failed" ? <Badge tone="bad">{t.errorCode || "failed"}</Badge>
                        : <Badge tone="warn">{t.status}</Badge>}
                    </td>
                    <td className="sub">{t.processingMs ? `${(t.processingMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td>{t.rating ? (t.rating === "up" ? "👍" : "👎") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No try-ons yet.</Empty>}
      </Card>

      <div className="grid-2">
        <Card title="Store controls">
          <div className="stack">
            {s.isSuspended ? (
              <ActionForm shop={s.shop} action="unsuspend" label="Unsuspend store" className="btn" />
            ) : (
              <ActionForm shop={s.shop} action="suspend" label="Suspend store" className="btn warn" confirm={`Suspend ${s.shop}? Try-on stops immediately.`}>
                <label>Reason<input className="input" name="reason" placeholder="Policy violation" maxLength={200} /></label>
              </ActionForm>
            )}
            <ActionForm
              shop={s.shop}
              action={s.isEnabled ? "disable_widget" : "enable_widget"}
              label={s.isEnabled ? "Switch try-on off" : "Switch try-on on"}
              className="btn ghost"
              confirm={s.isEnabled ? `Hide the try-on button on ${s.shop}?` : undefined}
            />
            <ActionForm shop={s.shop} action="reset_credits" label="Reset usage" className="btn ghost" confirm={`Reset this cycle's usage to zero for ${s.shop}?`} />
            <ActionForm shop={s.shop} action="delete_data" label="Delete leads and try-on history" className="btn danger" typeToConfirm={s.shop} />
          </div>
        </Card>

        <Card title="Change history" flush>
          {data.audit.length ? (
            <ul className="feed">
              {data.audit.map((row) => (
                <li key={row.id}>
                  <span className="feed-action">{row.action.replace(/_/g, " ")}</span>
                  <span className="feed-meta">{row.adminShop} · {dateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Nothing has been changed from an admin screen.</Empty>}
        </Card>
      </div>
    </Shell>
  );
}
