import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateTime } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { Card, Empty, PageHead, Pager } from "@/components/ui";

interface Audit {
  page: number; pages: number; total: number;
  rows: { id: string; action: string; adminShop: string; targetShop: string | null; details: string | null; createdAt: string }[];
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const data = await api.audit<Audit>(Number(params.page) || 1);

  return (
    <Shell email={session.email} active="/audit">
      <PageHead title="Audit log" subtitle="Every change made from an admin screen, by anyone." />
      <Card flush>
        {data.rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Who</th><th>Did what</th><th>To</th><th>Detail</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap sub">{dateTime(r.createdAt)}</td>
                    <td>{r.adminShop}</td>
                    <td><b>{r.action.replace(/_/g, " ")}</b></td>
                    <td>{r.targetShop ? <Link className="mono" href={`/stores/${encodeURIComponent(r.targetShop)}`}>{r.targetShop}</Link> : "—"}</td>
                    <td className="sub clip">{r.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Nothing has been changed yet.</Empty>}
      </Card>
      <Pager base="/audit?" page={data.page} pages={data.pages} />
    </Shell>
  );
}
