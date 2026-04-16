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
                <div style={{ padding: "24px" }}>
                <div className="fv-section-title fv-mb-md">🤖 GenLook API Status</div>
                {data.genlookCredits >= 0 ? (
                    <>
                      <div className="fv-flex fv-items-center fv-mb-md">
                          <span className="fv-status-dot connected"></span>
                          <span style={{ fontWeight: 600 }}>API Connected</span>
                      </div>
                      <div className="fv-text-sm fv-text-subdued fv-mb-sm">GLOBAL CREDITS REMAINING</div>
                      <div style={{ fontSize: "36px", fontWeight: "bold" }} className="accent">
                          {data.genlookCredits === 999999 ? "Unlimited" : data.genlookCredits.toLocaleString()}
                      </div>
                    </>
                ) : (
                    <>
                      <div className="fv-flex fv-items-center fv-mb-md">
                          <span className="fv-status-dot suspended"></span>
                          <span style={{ fontWeight: 600 }}>API Unreachable</span>
                      </div>
                      <s-banner tone="critical">
                          <p>Unable to reach GenLook API. Check your GENLOOK_API_KEY environment variable.</p>
                      </s-banner>
                    </>
                )}
                </div>
              </s-card>
          </div>

          {/* Revenue */}
          <div style={{ flex: "1 1 300px" }}>
              <s-card>
                <div style={{ padding: "24px" }}>
                    <div className="fv-section-title fv-mb-md">💰 Financials</div>
                    <div className="fv-text-sm fv-text-subdued fv-mb-sm">OVERAGE REVENUE (ALL TIME)</div>
                    <div style={{ fontSize: "36px", fontWeight: "bold", color: "var(--fv-success)" }}>
                      ${data.totalOverageRevenue.toFixed(2)}
                    </div>
                    <div className="fv-text-sm fv-text-subdued fv-mt-md">
                      Base subscription revenue is handled via Shopify Partners dashboard.
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
