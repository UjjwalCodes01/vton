import Link from "next/link";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { AccountGrant } from "@/components/AccountGrant";
import { KeyCredits, KeyRevoke } from "@/components/KeyControls";
import { Badge, Card, PageHead } from "@/components/ui";

interface AccountRow { id: string; email: string; name: string | null; credits: number; createdAt: string;
  keys: { id: string; name: string; prefix: string; revokedAt: string | null; lastUsedAt: string | null;
    credits: number | null; issuedBy: string; note: string | null }[];
  grants: { id: string; reference: string; amount: number; actor: string; createdAt: string }[];
  _count: { apiRuns: number }; }

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q || "";
  const data = await api.accounts<{ page: number; accounts: AccountRow[] }>(page, q);
  return <Shell email={session.email} active="/accounts">
    <PageHead title="API customers" subtitle="Signed-in accounts, their keys and manual credit grants." />
    <p className="sub" style={{ marginTop: 0, marginBottom: 16 }}>
      To generate a key — standalone, or issued to a customer — and to manage every key, go to{" "}
      <Link href="/keys">API keys</Link>.
    </p>
    <form method="get" action="/accounts" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input className="input" type="search" name="q" defaultValue={q} placeholder="Search email, name or account ID" style={{ minWidth: 280 }} />
      <button className="btn" type="submit">Search</button>
    </form>
    <Card flush><div className="table-wrap"><table className="table"><thead><tr><th>Account</th><th>Credits</th><th>API keys</th><th>Requests</th><th>Recent grants</th><th>Grant paid credits</th></tr></thead><tbody>
      {data.accounts.map((account) => <tr key={account.id}>
        <td><b>{account.name || account.email}</b><div className="sub">{account.email}</div><div className="mono sub">{account.id}</div></td>
        <td>{account.credits}</td>
        <td style={{ minWidth: 280 }}>{account.keys.map((key) => <div key={key.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line, #eee)" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <b>{key.name}</b>
            <span className="mono sub">{key.prefix}…</span>
            {key.issuedBy === "admin" ? <Badge tone="accent">issued</Badge> : <Badge>self-serve</Badge>}
            {key.revokedAt ? <Badge tone="bad">revoked</Badge> : null}
          </div>
          <div className="sub">
            {key.credits !== null ? `${key.credits.toLocaleString("en-US")} try-ons left` : "uses account credits"}
            {key.lastUsedAt ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString("en-GB")}` : " · never used"}
            {key.note ? ` · ${key.note}` : ""}
          </div>
          {!key.revokedAt ? <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {key.issuedBy === "admin" ? <KeyCredits keyId={key.id} /> : null}
            <KeyRevoke keyId={key.id} label={`${key.name} (${key.prefix}…)`} />
          </div> : null}
        </div>)}</td>
        <td>{account._count.apiRuns}</td>
        <td>{account.grants.map((grant) => <div key={grant.id} className="mono sub">+{grant.amount} · {grant.reference}</div>)}</td>
        <td><AccountGrant accountId={account.id} /></td>
      </tr>)}
    </tbody></table></div></Card>
    <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
      {page > 1 ? <Link className="btn ghost" href={`/accounts?page=${page - 1}&q=${encodeURIComponent(q)}`}>Previous</Link> : null}
      {data.accounts.length === 50 ? <Link className="btn ghost" href={`/accounts?page=${page + 1}&q=${encodeURIComponent(q)}`}>Next</Link> : null}
    </div>
  </Shell>;
}
