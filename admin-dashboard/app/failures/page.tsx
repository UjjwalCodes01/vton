import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateTime, number } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { Badge, Card, Empty, PageHead, Pager } from "@/components/ui";

interface Failures {
  page: number; pages: number; total: number;
  rows: { id: string; shop: string; productTitle: string | null; errorCode: string | null; errorMessage: string | null; createdAt: string }[];
}

export default async function FailuresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const data = await api.failures<Failures>(Number(params.page) || 1);

  return (
    <Shell email={session.email} active="/failures">
      <PageHead title="Failures" subtitle={`${number(data.total)} failed try-on${data.total === 1 ? "" : "s"} on record`} />
      <Card flush>
        {data.rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Store</th><th>Product</th><th>Error</th><th>Detail</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap sub">{dateTime(r.createdAt)}</td>
                    <td><Link className="mono" href={`/stores/${encodeURIComponent(r.shop)}`}>{r.shop}</Link></td>
                    <td>{r.productTitle || "—"}</td>
                    <td><Badge tone="bad">{r.errorCode || "unknown"}</Badge></td>
                    <td className="sub clip">{r.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No failed try-ons. Good sign.</Empty>}
      </Card>
      <Pager base="/failures?" page={data.page} pages={data.pages} />
    </Shell>
  );
}
