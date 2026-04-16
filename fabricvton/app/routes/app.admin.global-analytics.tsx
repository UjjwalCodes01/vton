import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  // Global 30-day stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await db.analyticsDaily.findMany({
    where: { date: { gte: thirtyDaysAgo } },
    orderBy: { date: "asc" },
  });

  // Aggregate across ALL shops per date
  const dateMap = new Map<string, {
    widgetOpens: number;
    emailsCaptured: number;
    tryOnsCompleted: number;
    tryOnsFailed: number;
  }>();

  for (const row of dailyStats) {
    const dateKey = new Date(row.date).toISOString().split("T")[0];
    const existing = dateMap.get(dateKey) || {
      widgetOpens: 0,
      emailsCaptured: 0,
      tryOnsCompleted: 0,
      tryOnsFailed: 0,
    };
    existing.widgetOpens += row.widgetOpens;
    existing.emailsCaptured += row.emailsCaptured;
    existing.tryOnsCompleted += row.tryOnsCompleted;
    existing.tryOnsFailed += row.tryOnsFailed;
    dateMap.set(dateKey, existing);
  }

  const aggregated = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  // Totals
  const totals = aggregated.reduce(
    (acc, row) => ({
      widgetOpens: acc.widgetOpens + row.widgetOpens,
      emailsCaptured: acc.emailsCaptured + row.emailsCaptured,
      tryOnsCompleted: acc.tryOnsCompleted + row.tryOnsCompleted,
      tryOnsFailed: acc.tryOnsFailed + row.tryOnsFailed,
    }),
    { widgetOpens: 0, emailsCaptured: 0, tryOnsCompleted: 0, tryOnsFailed: 0 }
  );

  const conversionRate =
    totals.widgetOpens > 0
      ? ((totals.tryOnsCompleted / totals.widgetOpens) * 100).toFixed(1)
      : "0.0";

  // Revenue per plan
  const planDistribution = await db.shopConfig.groupBy({
    by: ["plan"],
    _count: true,
  });

  // Failed events with error messages (recent 20)
  const recentErrors = await db.tryOnEvent.findMany({
    where: { status: "failed" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      shop: true,
      errorMessage: true,
      productTitle: true,
      createdAt: true,
    },
  });

  return { aggregated, totals, conversionRate, planDistribution, recentErrors };
};

export default function GlobalAnalytics() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="📊 Global Analytics">
      {/* KPIs */}
      <s-section heading="Platform Totals (30 Days)">
        <div className="fv-kpi-grid">
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.totals.widgetOpens}</div>
            <div className="fv-kpi-label">Widget Opens</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value accent">{data.totals.tryOnsCompleted}</div>
            <div className="fv-kpi-label">Try-Ons Completed</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.conversionRate}%</div>
            <div className="fv-kpi-label">Conversion Rate</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value success">{data.totals.emailsCaptured}</div>
            <div className="fv-kpi-label">Emails Captured</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value danger">{data.totals.tryOnsFailed}</div>
            <div className="fv-kpi-label">Failed try-ons</div>
          </div>
        </div>
      </s-section>

      <div className="fv-flex fv-gap-md fv-flex-wrap fv-items-start" style={{ marginTop: "32px" }}>
         {/* Plan Distribution */}
         <div style={{ flex: "1 1 300px" }}>
            <div className="fv-section-title">📦 Store Plan Distribution</div>
            <s-card>
               <table className="fv-table" style={{ borderCollapse: "collapse" }}>
               <thead>
                  <tr>
                     <th>Plan Tier</th>
                     <th style={{ textAlign: "right" }}>Stores</th>
                  </tr>
               </thead>
               <tbody>
                  {data.planDistribution.map((p) => (
                     <tr key={p.plan}>
                     <td>
                        <span className={`fv-badge ${p.plan === 'free' ? 'neutral' : 'purple'}`}>
                           {p.plan.toUpperCase()}
                        </span>
                     </td>
                     <td style={{ textAlign: "right", fontWeight: "bold" }}>{p._count}</td>
                     </tr>
                  ))}
               </tbody>
               </table>
            </s-card>
         </div>

         {/* Daily Breakdown */}
         <div style={{ flex: "2 1 600px" }}>
            <div className="fv-section-title">📅 Daily Breakdown (Global)</div>
            <s-card>
               {data.aggregated.length === 0 ? (
               <div className="fv-empty-state">
                  <div className="icon">📈</div>
                  <h3>No Global Data</h3>
                  <p>Aggregate try-on stats will populate once stores are active.</p>
               </div>
               ) : (
               <div style={{ overflowX: "auto" }}>
                  <table className="fv-table">
                     <thead>
                     <tr>
                        <th>Date</th>
                        <th>Opens</th>
                        <th>Try-Ons</th>
                        <th>Emails</th>
                        <th>Failed</th>
                     </tr>
                     </thead>
                     <tbody>
                     {data.aggregated.map((row) => (
                        <tr key={row.date}>
                           <td>{new Date(row.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</td>
                           <td>{row.widgetOpens}</td>
                           <td><span className="fv-badge purple">{row.tryOnsCompleted}</span></td>
                           <td>{row.emailsCaptured}</td>
                           <td>{row.tryOnsFailed > 0 ? <span className="fv-badge danger">{row.tryOnsFailed}</span> : "0"}</td>
                        </tr>
                     ))}
                     </tbody>
                  </table>
               </div>
               )}
            </s-card>
         </div>
      </div>

      {/* Recent Errors */}
      <s-section heading="Recent Errors (Across Network)">
         <s-card>
            {data.recentErrors.length === 0 ? (
               <div className="fv-empty-state">
               <div className="icon">🎉</div>
               <h3>Zero Errors Detected</h3>
               <p>The Global API integrations are running smoothly.</p>
               </div>
            ) : (
               <div style={{ overflowX: "auto" }}>
               <table className="fv-table">
                  <thead>
                     <tr>
                        <th>Store Domain</th>
                        <th>Product Context</th>
                        <th>Error Message</th>
                        <th>Timestamp</th>
                     </tr>
                  </thead>
                  <tbody>
                     {data.recentErrors.map((e, i: number) => (
                     <tr key={i}>
                        <td><strong>{e.shop}</strong></td>
                        <td>{e.productTitle ?? "—"}</td>
                        <td style={{ color: "var(--fv-danger)", maxWidth: "400px" }}>
                           {e.errorMessage ?? "Unknown Exception"}
                        </td>
                        <td className="fv-text-subdued">
                           {new Date(e.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short"})}
                        </td>
                     </tr>
                     ))}
                  </tbody>
               </table>
               </div>
            )}
         </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
