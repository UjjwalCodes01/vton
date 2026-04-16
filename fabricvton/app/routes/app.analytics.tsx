import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await db.analyticsDaily.findMany({
    where: { shop, date: { gte: startDate } },
    orderBy: { date: "asc" },
  });

  const totals = await db.analyticsDaily.aggregate({
    where: { shop, date: { gte: startDate } },
    _sum: {
      widgetOpens: true,
      emailsCaptured: true,
      tryOnsCompleted: true,
      tryOnsFailed: true,
    },
  });

  const opens = totals._sum.widgetOpens ?? 0;
  const completions = totals._sum.tryOnsCompleted ?? 0;
  const conversionRate = opens > 0 ? ((completions / opens) * 100).toFixed(1) : "0.0";
  const emailCaptureRate = opens > 0
    ? (((totals._sum.emailsCaptured ?? 0) / opens) * 100).toFixed(1)
    : "0.0";

  return {
    days,
    dailyStats,
    totals: {
      opens,
      completions,
      emailsCaptured: totals._sum.emailsCaptured ?? 0,
      failed: totals._sum.tryOnsFailed ?? 0,
    },
    conversionRate,
    emailCaptureRate,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await db.analyticsDaily.findMany({
    where: { shop, date: { gte: startDate } },
    orderBy: { date: "desc" },
  });

  const csvRows = [
    "Date,Widget Opens,Try-Ons Completed,Emails Captured,Failed Try-Ons",
    ...dailyStats.map((row) =>
      `"${new Date(row.date).toLocaleDateString()}","${row.widgetOpens}","${row.tryOnsCompleted}","${row.emailsCaptured}","${row.tryOnsFailed}"`
    ),
  ];

  const csv = csvRows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="fabricvton-analytics-${days}d.csv"`,
    },
  });
};

export default function Analytics() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      <div className="fv-filter-bar">
        <s-button href="?days=7" variant={data.days === 7 ? "primary" : undefined}>Last 7 Days</s-button>
        <s-button href="?days=14" variant={data.days === 14 ? "primary" : undefined}>Last 14 Days</s-button>
        <s-button href="?days=30" variant={data.days === 30 ? "primary" : undefined}>Last 30 Days</s-button>
        <div style={{ flex: 1 }}></div>
        <form method="post" action={`?days=${data.days}`} target="_blank">
          <s-button type="submit" variant="secondary">⬇ Export Data (CSV)</s-button>
        </form>
      </div>

      <s-section heading={`Summary (${data.days} Days)`}>
        <div className="fv-kpi-grid">
          <div className="fv-kpi-card">
             <div className="fv-kpi-label fv-mb-sm">Try-On Funnel</div>
             <div className="fv-flex fv-justify-between fv-items-center fv-mb-sm">
                <span className="fv-text-subdued">Widget Opens</span>
                <span className="fv-text-sm" style={{ fontWeight: "bold" }}>{data.totals.opens}</span>
             </div>
             <div className="fv-flex fv-justify-between fv-items-center fv-mb-sm">
                <span className="fv-text-subdued">Try-Ons</span>
                <span className="fv-kpi-value accent fv-text-sm" style={{ fontSize: "16px" }}>{data.totals.completions}</span>
             </div>
             <div className="fv-progress-container" style={{ height: "4px" }}>
                <div 
                   className="fv-progress-fill" 
                   style={{ width: `${data.conversionRate}%` }}
                />
             </div>
             <div className="fv-text-sm fv-mt-sm">
                <strong>{data.conversionRate}%</strong> completion rate
             </div>
          </div>
          
          <div className="fv-kpi-card">
            <div className="fv-kpi-value success">{data.totals.emailsCaptured}</div>
            <div className="fv-kpi-label">Emails Captured</div>
            <div className="fv-text-sm fv-text-subdued fv-mt-sm">
               {data.emailCaptureRate}% capture rate
            </div>
          </div>

          <div className="fv-kpi-card">
            <div className="fv-kpi-value danger">{data.totals.failed}</div>
            <div className="fv-kpi-label">Failed try-ons</div>
            <div className="fv-text-sm fv-text-subdued fv-mt-sm">
               Usually due to invalid image
            </div>
          </div>
        </div>
      </s-section>

      <s-section heading="Daily Breakdown">
         <s-card>
            {data.dailyStats.length === 0 ? (
               <div className="fv-empty-state">
               <div className="icon">📊</div>
               <h3>No Analytics Data</h3>
               <p>Once shoppers start using the Try-On widget, daily data will appear here.</p>
               </div>
            ) : (
               <div style={{ overflowX: "auto" }}>
                  <table className="fv-table">
                  <thead>
                     <tr>
                        <th>Date</th>
                        <th>Widget Opens</th>
                        <th>Try-Ons</th>
                        <th>Emails Captured</th>
                        <th>Failed</th>
                     </tr>
                  </thead>
                  <tbody>
                     {data.dailyStats.map((row) => (
                        <tr key={row.id}>
                        <td>
                           {new Date(row.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td>{row.widgetOpens}</td>
                        <td><span className="fv-badge purple">{row.tryOnsCompleted}</span></td>
                        <td>{row.emailsCaptured > 0 ? <span className="fv-badge success">{row.emailsCaptured}</span> : "0"}</td>
                        <td>{row.tryOnsFailed > 0 ? <span className="fv-badge danger">{row.tryOnsFailed}</span> : "0"}</td>
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
