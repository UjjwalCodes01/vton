import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { number, timeAgo } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { Badge, Card, Empty, Meter, PageHead, Stat } from "@/components/ui";

interface Overview {
  counts: Record<string, number>;
  provider: { ok: boolean; detail?: string };
  busiest: {
    shop: string; platform: string; plan: string; planLabel: string;
    creditsUsed: number; monthlyCredits: number; customCredits: number | null; isSuspended: boolean;
  }[];
  recentAudit: { id: string; action: string; adminShop: string; targetShop: string | null; createdAt: string }[];
}

export default async function OverviewPage() {
  const session = await requireSession();
  const data = await api.overview<Overview>();
  const c = data.counts;
  const attempts = c.tryOns30 + c.failed30;

  return (
    <Shell email={session.email} active="/">
      <PageHead
        title="Overview"
        subtitle="Every store on both platforms, in one place."
        actions={
          data.provider?.ok
            ? <Badge tone="good">Provider connected</Badge>
            : <Badge tone="bad">Provider unreachable</Badge>
        }
      />

      <div className="stat-grid">
        <Stat label="Stores" value={number(c.stores)} hint={`${number(c.shopify)} Shopify · ${number(c.woo)} WooCommerce`} />
        <Stat label="Active" value={number(c.active)} hint={`${number(c.suspended)} suspended`} tone="good" />
        <Stat label="Try-ons, 30 days" value={number(c.tryOns30)} hint={`${number(c.tryOns)} all time`} />
        <Stat
          label="Failures, 30 days"
          value={number(c.failed30)}
          hint={attempts ? `${Math.round((c.failed30 / attempts) * 100)}% of attempts` : "no attempts yet"}
          tone={c.failed30 > 0 ? "warn" : ""}
        />
        <Stat label="Custom plans" value={number(c.customPlans)} hint="negotiated allowances" />
        <Stat label="Shared looks" value={number(c.sharedLooks)} hint="live share pages" />
      </div>

      <div className="grid-2">
        <Card title="Busiest stores" action={<Link className="btn ghost sm" href="/stores">All stores →</Link>} flush>
          {data.busiest.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Store</th><th>Plan</th><th>Usage</th><th /></tr></thead>
                <tbody>
                  {data.busiest.map((s) => (
                    <tr key={s.shop}>
                      <td>
                        <Link className="mono" href={`/stores/${encodeURIComponent(s.shop)}`}>{s.shop}</Link>{" "}
                        {s.isSuspended ? <Badge tone="bad">suspended</Badge> : null}
                      </td>
                      <td><Badge tone={s.customCredits != null ? "accent" : ""}>{s.planLabel}</Badge></td>
                      <td className="nowrap">{number(s.creditsUsed)} / {number(s.monthlyCredits)}</td>
                      <td style={{ width: 130 }}><Meter used={s.creditsUsed} of={s.monthlyCredits} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No stores yet.</Empty>}
        </Card>

        <Card title="Recent admin activity" action={<Link className="btn ghost sm" href="/audit">Full log →</Link>} flush>
          {data.recentAudit.length ? (
            <ul className="feed">
              {data.recentAudit.map((row) => (
                <li key={row.id}>
                  <span className="feed-action">{row.action.replace(/_/g, " ")}</span>
                  {row.targetShop ? <Link className="mono" href={`/stores/${encodeURIComponent(row.targetShop)}`}>{row.targetShop}</Link> : null}
                  <span className="feed-meta">{row.adminShop} · {timeAgo(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No admin actions recorded yet.</Empty>}
        </Card>
      </div>
    </Shell>
  );
}
