import Link from "next/link";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { count, timeAgo } from "@/lib/format";
import { PageHead, Shell } from "@/components/Shell";

export default async function GenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePortalSession();
  const { page } = await searchParams;

  let data, me;
  try {
    [me, data] = await Promise.all([api.me(session), api.generations(session, Number(page) || 1)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }

  const succeeded = data.generations.filter((g) => g.status === "success").length;

  return (
    <Shell active="/generations" account={me.account}>
      <PageHead
        title="Generations"
        subtitle="Every try-on your shoppers have run, newest first."
        actions={<span className="badge">{count(data.total)} total</span>}
      />

      {data.generations.length === 0 ? (
        <div className="card">
          <p className="empty">
            No try-ons yet. They appear here as soon as a shopper runs one on your store.
          </p>
        </div>
      ) : (
        <>
          <div className="grid cols-3" style={{ marginBottom: 18 }}>
            <div className="stat">
              <span className="stat-label">On this page</span>
              <b className="stat-value">{count(data.generations.length)}</b>
              <span className="stat-hint">{succeeded} succeeded</span>
            </div>
            <div className="stat">
              <span className="stat-label">All time</span>
              <b className="stat-value">{count(data.total)}</b>
              <span className="stat-hint">across your stores</span>
            </div>
            <div className="stat">
              <span className="stat-label">Liked</span>
              <b className="stat-value">{count(data.generations.filter((g) => g.rating === "up").length)}</b>
              <span className="stat-hint">on this page</span>
            </div>
          </div>

          <div className="gen-grid">
            {data.generations.map((gen) => (
              <article className="gen" key={gen.id}>
                {gen.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="gen-img" src={gen.imageUrl} alt={gen.productTitle || "Try-on result"} loading="lazy" />
                ) : (
                  <div className="gen-fallback">
                    {gen.status === "failed" ? "Did not finish" : "No image"}
                  </div>
                )}
                <div className="gen-meta">
                  <b>{gen.productTitle || "Untitled product"}</b>
                  <span>
                    {timeAgo(gen.createdAt)}
                    {gen.seconds ? ` · ${gen.seconds}s` : ""}
                    {gen.rating === "up" ? " · 👍" : gen.rating === "down" ? " · 👎" : ""}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {data.pages > 1 ? (
            <div className="pager">
              {data.page > 1 ? <Link className="btn ghost sm" href={`/generations?page=${data.page - 1}`}>← Newer</Link> : <span />}
              <span>Page {data.page} of {data.pages}</span>
              {data.page < data.pages ? <Link className="btn ghost sm" href={`/generations?page=${data.page + 1}`}>Older →</Link> : <span />}
            </div>
          ) : null}
        </>
      )}
    </Shell>
  );
}
