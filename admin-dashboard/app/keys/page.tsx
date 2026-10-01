import { api } from "@/lib/api";
import { requireSession } from "@/lib/guard";
import { dateOnly, number } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { KeyIssue } from "@/components/KeyIssue";
import { KeyCredits, KeyRename, KeyRevoke } from "@/components/KeyControls";
import { Badge, Card, Empty, PageHead, Pager } from "@/components/ui";

interface KeyRow {
  id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null;
  credits: number | null; issuedBy: "self" | "admin" | "standalone"; note: string | null;
  owner: { id: string; email: string } | null;
  available: number; requests: number; successful: number;
}
interface KeysResponse { page: number; pages: number; total: number; keys: KeyRow[] }

const TYPES: [string, string][] = [["", "Any type"], ["standalone", "Standalone"], ["admin", "Issued to a customer"], ["self", "Self-serve"]];
const STATUSES: [string, string][] = [["", "Active and revoked"], ["active", "Active"], ["revoked", "Revoked"]];
const TYPE_LABEL = { standalone: "standalone", admin: "issued", self: "self-serve" } as const;

export default async function KeysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const q = params.q || "";
  const type = params.type || "";
  const status = params.status || "";
  const data = await api.keys<KeysResponse>({ q, type, status, page: Number(params.page) || 1 });
  const base = `/keys?${new URLSearchParams({ q, type, status }).toString()}&`;

  return (
    <Shell email={session.email} active="/keys">
      <PageHead title="API keys" subtitle="Generate keys with any number of try-ons, and manage every key in the system." />

      <Card title="Generate a key">
        <p className="sub" style={{ marginTop: 0 }}>
          Leave the email empty for a <b>standalone</b> key: it needs no account and is managed only from here. Add an email
          to issue it to that customer instead — it appears in their platform account. Either way the key has its own
          try-ons, and failed try-ons go back to it. The key is shown once.
        </p>
        <KeyIssue />
      </Card>
      <div style={{ height: 16 }} />

      <form method="get" action="/keys" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Name, prefix, note, email or key ID" style={{ minWidth: 280 }} />
        <select className="input" name="type" defaultValue={type} aria-label="Key type">
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="input" name="status" defaultValue={status} aria-label="Key status">
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn" type="submit">Filter</button>
      </form>

      <Card flush>
        {data.keys.length === 0 ? (
          <Empty>No keys match.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Key</th><th>Owner</th><th>Try-ons left</th><th>Usage</th><th>Dates</th><th>Manage</th></tr>
              </thead>
              <tbody>
                {data.keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <b>{key.name}</b>
                      <div className="mono sub">{key.prefix}…</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        <Badge tone={key.issuedBy === "self" ? "" : "accent"}>{TYPE_LABEL[key.issuedBy] ?? key.issuedBy}</Badge>
                        {key.revokedAt ? <Badge tone="bad">revoked</Badge> : <Badge tone="good">active</Badge>}
                      </div>
                      {key.note ? <div className="sub" style={{ marginTop: 4 }}>{key.note}</div> : null}
                    </td>
                    <td>{key.owner ? <span className="sub">{key.owner.email}</span> : <span className="sub">— none</span>}</td>
                    <td>
                      <b>{number(key.available)}</b>
                      <div className="sub">{key.credits !== null ? "own allowance" : "account balance"}</div>
                    </td>
                    <td>
                      {number(key.requests)} requests
                      <div className="sub">{number(key.successful)} finished</div>
                    </td>
                    <td className="sub">
                      Created {dateOnly(key.createdAt)}
                      <div>{key.lastUsedAt ? `Last used ${dateOnly(key.lastUsedAt)}` : "Never used"}</div>
                      {key.revokedAt ? <div>Revoked {dateOnly(key.revokedAt)}</div> : null}
                    </td>
                    <td style={{ minWidth: 250 }}>
                      {key.revokedAt ? (
                        <span className="sub">No actions — revoked keys can&apos;t be restored.</span>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {key.credits !== null ? <KeyCredits keyId={key.id} /> : null}
                          <KeyRename keyId={key.id} name={key.name} note={key.note} />
                          <div><KeyRevoke keyId={key.id} label={`${key.name} (${key.prefix}…)`} /></div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="sub" style={{ marginTop: 10 }}>{number(data.total)} keys</p>
      <Pager base={base} page={data.page} pages={data.pages} />
    </Shell>
  );
}
