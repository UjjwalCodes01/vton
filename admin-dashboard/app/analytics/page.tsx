import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { number } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { BarChart, Card, Empty, PageHead } from "@/components/ui";

interface Analytics {
  days: { date: string; opens: number; tryOns: number; failed: number; leads: number }[];
  errors: { code: string; count: number }[];
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const days = Number(params.days) || 30;
  const data = await api.analytics<Analytics>(days);

  const totals = data.days.reduce(
    (acc, d) => ({ opens: acc.opens + d.opens, tryOns: acc.tryOns + d.tryOns, failed: acc.failed + d.failed }),
    { opens: 0, tryOns: 0, failed: 0 },
  );

  return (
    <Shell email={session.email} active="/analytics">
      <PageHead
        title="Analytics"
        subtitle={`${number(totals.tryOns)} try-ons · ${number(totals.opens)} widget opens · ${number(totals.failed)} failures`}
        actions={[7, 30, 90].map((n) => (
          <Link key={n} className={`btn sm ${n === days ? "" : "ghost"}`} href={`/analytics?days=${n}`}>{n} days</Link>
        ))}
      />

      <Card title="Try-ons per day" flush>
        <BarChart rows={data.days.map((d) => ({ label: d.date, value: d.tryOns }))} height={160} />
      </Card>

      <div className="grid-2">
        <Card title="Widget opens per day" flush>
          <BarChart rows={data.days.map((d) => ({ label: d.date, value: d.opens }))} height={130} />
        </Card>
        <Card title="Why try-ons failed" flush>
          {data.errors.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Error</th><th className="right">Count</th></tr></thead>
                <tbody>
                  {data.errors.map((e) => (
                    <tr key={e.code}><td className="mono">{e.code}</td><td className="right">{number(e.count)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No failures in this period.</Empty>}
        </Card>
      </div>
    </Shell>
  );
}
