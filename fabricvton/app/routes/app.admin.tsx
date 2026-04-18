import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { checkCredits } from "../genlook.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  // Global counts
  const [totalShops, activeShops, totalLeads, totalTryOns, totalFailed] =
    await Promise.all([
      db.shopConfig.count(),
      db.shopConfig.count({ where: { isEnabled: true, isSuspended: false } }),
      db.lead.count(),
      db.tryOnEvent.count({ where: { status: "success" } }),
      db.tryOnEvent.count({ where: { status: "failed" } }),
    ]);

  // GenLook API credits remaining
  let genlookCredits = -1;
  try {
    const c = await checkCredits();
    genlookCredits = c.credits;
  } catch {
    // API might be unreachable
  }

  // Revenue estimate (sum of overage charges across all shops)
  const revenueResult = await db.shopConfig.aggregate({
    _sum: { overageChargesTotal: true },
  });

  // Suspended shops count
  const suspendedShops = await db.shopConfig.count({
    where: { isSuspended: true },
  });

  // Top 5 shops by usage
  const topShops = await db.shopConfig.findMany({
    orderBy: { creditsUsed: "desc" },
    take: 5,
    select: { shop: true, plan: true, creditsUsed: true, monthlyCredits: true },
  });

  return {
    totalShops,
    activeShops,
    suspendedShops,
    totalLeads,
    totalTryOns,
    totalFailed,
    genlookCredits,
    totalOverageRevenue: revenueResult._sum.overageChargesTotal ?? 0,
    topShops,
  };
};

export default function SuperAdminDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="⚡ Super Admin Dashboard">
      {/* Platform Health */}
      <s-section heading="Platform Overview">
        <div className="fv-kpi-grid">
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.totalShops}</div>
            <div className="fv-kpi-label">Total Stores</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value success">{data.activeShops}</div>
            <div className="fv-kpi-label">Active Stores</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value warning">{data.suspendedShops}</div>
            <div className="fv-kpi-label">Suspended</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value accent">{data.totalTryOns}</div>
            <div className="fv-kpi-label">Total Try-Ons</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value danger">{data.totalFailed}</div>
            <div className="fv-kpi-label">Failed Generations</div>
          </div>
          <div className="fv-kpi-card">
            <div className="fv-kpi-value">{data.totalLeads}</div>
            <div className="fv-kpi-label">Total Leads</div>
          </div>
        </div>
      </s-section>

      <s-section>
        <div className="fv-flex fv-gap-md fv-flex-wrap" style={{ alignItems: "stretch" }}>
          {/* GenLook API Health */}
          <div style={{ flex: "1 1 300px" }}>
              <s-card>
                <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", height: "100%", background: "linear-gradient(145deg, #ffffff, #f9fafb)" }}>
                  <div className="fv-flex fv-items-center fv-justify-between fv-mb-lg">
                    <div className="fv-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>🤖</span> GenLook API Status
                    </div>
                    {data.genlookCredits >= 0 ? (
                      <span className="fv-badge success" style={{ padding: "4px 12px" }}>● Connected</span>
                    ) : (
                      <span className="fv-badge critical" style={{ padding: "4px 12px" }}>● Unreachable</span>
                    )}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {data.genlookCredits >= 0 ? (
                        <>
                          <div className="fv-text-sm fv-text-subdued fv-mb-xs" style={{ letterSpacing: "0.5px" }}>GLOBAL CREDITS REMAINING</div>
                          <div style={{ fontSize: "42px", fontWeight: "800", color: "var(--s-color-interactive)" }}>
                              {data.genlookCredits === 999999 ? "Unlimited" : data.genlookCredits.toLocaleString()}
                          </div>
                        </>
                    ) : (
                        <s-banner tone="critical">
                            <p>Unable to reach GenLook API. Check your GENLOOK_API_KEY environment variable.</p>
                        </s-banner>
                    )}
                  </div>
                </div>
              </s-card>
          </div>

          {/* Revenue */}
          <div style={{ flex: "1 1 300px" }}>
              <s-card>
                <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", height: "100%", background: "linear-gradient(145deg, #ffffff, #f0fdf4)" }}>
                    <div className="fv-section-title fv-mb-lg" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>💰</span> Financials
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyItems: "center" }}>
                      <div className="fv-text-sm fv-text-subdued fv-mb-xs" style={{ letterSpacing: "0.5px" }}>TOTAL OVERAGE CHARGES</div>
                      <div style={{ fontSize: "42px", fontWeight: "800", color: "#166534" }}>
                        ${data.totalOverageRevenue.toFixed(2)}
                      </div>
                      <div className="fv-text-sm fv-text-subdued" style={{ marginTop: "16px", padding: "12px", background: "rgba(22, 101, 52, 0.05)", borderRadius: "8px", borderLeft: "3px solid #166534" }}>
                        <strong>Note:</strong> Total base subscription rev. (Monthly/Annual plans) is handled exclusively within the Shopify Partners Dashboard.
                      </div>
                    </div>
                </div>
              </s-card>
          </div>
        </div>
      </s-section>

      {/* Top Stores */}
      <s-section heading="Top 5 Stores by Usage">
        <s-card>
         {data.topShops.length === 0 ? (
            <div className="fv-empty-state">
               <div className="icon">🏪</div>
               <h3>No Stores Installed</h3>
               <p>Once stores install your app, the top users will appear here.</p>
            </div>
         ) : (
            <div style={{ overflowX: "auto", padding: "16px" }}>
               <table className="fv-table">
               <thead>
                  <tr>
                     <th>Store Domain</th>
                     <th>Plan</th>
                     <th>Credits Used</th>
                     <th>Allowance</th>
                     <th>Usage %</th>
                  </tr>
               </thead>
               <tbody>
                  {data.topShops.map((s) => {
                     const pct = s.monthlyCredits > 0 ? Math.round((s.creditsUsed / s.monthlyCredits) * 100) : 0;
                     return (
                     <tr key={s.shop}>
                        <td><strong>{s.shop}</strong></td>
                        <td><span className={`fv-badge ${s.plan === 'free' ? 'neutral' : 'purple'}`}>{s.plan.toUpperCase()}</span></td>
                        <td>{s.creditsUsed}</td>
                        <td>{s.monthlyCredits}</td>
                        <td>
                           <div className="fv-flex fv-items-center fv-gap-sm">
                              <div style={{ width: "60px", height: "6px", background: "var(--s-color-bg-surface-secondary)", borderRadius: "999px", overflow: "hidden" }}>
                                 <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "var(--fv-danger)" : "var(--fv-accent)" }}></div>
                              </div>
                              <span className="fv-text-sm">{pct}%</span>
                           </div>
                        </td>
                     </tr>
                  )})}
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
