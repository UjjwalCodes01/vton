import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateOnly, number } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { Badge, Card, Empty, Meter, PageHead, Pager, PlatformBadge } from "@/components/ui";

interface StoreRow {
  shop: string; platform: string; storeName: string | null; siteUrl: string | null;
  planLabel: string; isCustom: boolean; customLabel: string | null;
  credits: number; used: number; isEnabled: boolean; isSuspended: boolean;
  connectionStatus: string | null; installedAt: string;
}
interface StoresResponse {
  page: number; pages: number; total: number;
  plans: { name: string; label: string }[];
  stores: StoreRow[];
}

const STATUSES = [
  ["", "Any status"],
  ["custom", "On a custom plan"],
  ["suspended", "Suspended"],
  ["disabled", "Try-on switched off"],
  ["disconnected", "Disconnected"],
];

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const data = await api.stores<StoresResponse>({
    q: params.q,
    platform: params.platform,
    plan: params.plan,
    status: params.status,
    page: Number(params.page) || 1,
  });

  const filtered = Boolean(params.q || params.platform || params.plan || params.status);
  const base = `/stores?${new URLSearchParams(
    Object.entries({ q: params.q, platform: params.platform, plan: params.plan, status: params.status })
      .filter(([, v]) => v)
      .map(([k, v]) => [k, String(v)]),
  ).toString()}${filtered ? "&" : ""}`;

  return (
    <Shell email={session.email} active="/stores">
      <PageHead title="Stores" subtitle={`${number(data.total)} store${data.total === 1 ? "" : "s"} across Shopify and WooCommerce`} />

      <form className="filters" method="get" action="/stores">
        <input className="input grow" type="search" name="q" defaultValue={params.q || ""} placeholder="Search domain, site, store name or email" />
        <select className="input" name="platform" defaultValue={params.platform || ""}>
          <option value="">Both platforms</option>
          <option value="shopify">Shopify</option>
          <option value="woocommerce">WooCommerce</option>
        </select>
        <select className="input" name="plan" defaultValue={params.plan || ""}>
          <option value="">Any plan</option>
          {data.plans.map((p) => <option key={p.name} value={p.name}>{p.label}</option>)}
        </select>
        <select className="input" name="status" defaultValue={params.status || ""}>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn" type="submit">Filter</button>
        {filtered ? <Link className="btn ghost" href="/stores">Clear</Link> : null}
      </form>

      <Card flush>
        {data.stores.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Store</th><th>Platform</th><th>Plan</th><th>Usage this cycle</th><th>Status</th><th>Installed</th><th /></tr>
              </thead>
              <tbody>
                {data.stores.map((s) => (
                  <tr key={s.shop}>
                    <td>
                      <Link className="mono strong" href={`/stores/${encodeURIComponent(s.shop)}`}>{s.shop}</Link>
                      <div className="sub">{s.storeName || s.siteUrl || ""}</div>
                    </td>
                    <td><PlatformBadge platform={s.platform} /></td>
                    <td>{s.planLabel}</td>
                    <td className="nowrap">
                      {number(s.used)} / {number(s.credits)}
                      <Meter used={s.used} of={s.credits} slim />
                    </td>
                    <td>
                      {s.isSuspended ? <Badge tone="bad">suspended</Badge> : null}
                      {!s.isEnabled ? <Badge tone="warn">try-on off</Badge> : null}
                      {s.connectionStatus === "disconnected" ? <Badge tone="warn">disconnected</Badge> : null}
                      {s.isCustom ? <Badge tone="accent">{s.customLabel || "custom"}</Badge> : null}
                      {!s.isSuspended && s.isEnabled && s.connectionStatus !== "disconnected" && !s.isCustom
                        ? <Badge tone="good">ok</Badge> : null}
                    </td>
                    <td className="nowrap sub">{dateOnly(s.installedAt)}</td>
                    <td className="right"><Link className="btn ghost sm" href={`/stores/${encodeURIComponent(s.shop)}`}>Manage</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No stores match those filters.</Empty>}
      </Card>

      <Pager base={base} page={data.page} pages={data.pages} />
    </Shell>
  );
}
