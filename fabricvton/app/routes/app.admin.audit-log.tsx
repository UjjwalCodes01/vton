import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, Form, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { Prisma } from "@prisma/client";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const perPage = 50;
  const filterAction = url.searchParams.get("action") || "";
  const filterShop = url.searchParams.get("shop") || "";

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (filterAction) where.action = filterAction;
  if (filterShop) where.targetShop = { contains: filterShop };

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.adminAuditLog.count({ where }),
  ]);

  // Get distinct action types for filter dropdown
  const actionTypes = await db.adminAuditLog.groupBy({
    by: ["action"],
  });

  return {
    logs,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    actionTypes: actionTypes.map((a) => a.action),
    filterAction,
    filterShop,
  };
};

export default function AuditLog() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <s-page heading="📋 Admin Audit Log">
      {/* Filters */}
      <s-section heading="Filter Logs">
         <s-card>
            <div style={{ padding: "20px" }}>
               <Form method="get" className="fv-filter-bar fv-mb-md" onChange={(e) => submit(e.currentTarget)}>
                  <select
                     name="action"
                     defaultValue={data.filterAction}
                     className="fv-select"
                     style={{ minWidth: "180px" }}
                  >
                     <option value="">All Actions</option>
                     {data.actionTypes.map((a: string) => (
                        <option key={a} value={a}>
                           {a.replace(/_/g, ' ').toUpperCase()}
                        </option>
                     ))}
                  </select>
                  <input
                     name="shop"
                     type="search"
                     placeholder="Filter by target shop..."
                     defaultValue={data.filterShop}
                     className="fv-input"
                     style={{ minWidth: "250px" }}
                  />
               </Form>

               {/* Log Table */}
               {data.logs.length === 0 ? (
                  <div className="fv-empty-state">
                     <div className="icon">📭</div>
                     <h3>No Audit Events Found</h3>
                     <p>There are no recorded actions matching these filters.</p>
                  </div>
               ) : (
                  <div style={{ overflowX: "auto" }}>
                     <table className="fv-table">
                        <thead>
                           <tr>
                              <th>Time</th>
                              <th>Admin</th>
                              <th>Action</th>
                              <th>Target Shop</th>
                              <th>Details</th>
                           </tr>
                        </thead>
                        <tbody>
                           {data.logs.map((log) => {
                              let details = "";
                              try {
                                 details = log.details
                                 ? JSON.stringify(JSON.parse(log.details), null, 2)
                                 : "—";
                              } catch {
                                 details = log.details ?? "—";
                              }

                              return (
                                 <tr key={log.id}>
                                    <td style={{ whiteSpace: "nowrap" }} className="fv-text-subdued">
                                       {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}
                                    </td>
                                    <td><strong>{log.adminShop}</strong></td>
                                    <td>
                                       <span className={`fv-badge ${badgeColor(log.action)}`}>
                                          {log.action.replace(/_/g, ' ')}
                                       </span>
                                    </td>
                                    <td>{log.targetShop ?? "—"}</td>
                                    <td style={{ maxWidth: "400px" }}>
                                       {details !== '—' ? (
                                          <pre style={{ margin: 0, fontSize: "11px", background: "none", whiteSpace: "pre-wrap", color: "var(--s-color-text-secondary)" }}>
                                             {details}
                                          </pre>
                                       ) : "—"}
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               )}

               {/* Pagination */}
               {data.totalPages > 1 && (
                  <div className="fv-pagination fv-mt-md">
                     {data.page > 1 && (
                        <s-button
                           onClick={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set("page", String(data.page - 1));
                              window.location.assign(url.toString());
                           }}
                        >
                           ← Previous
                        </s-button>
                     )}
                     <span className="page-info">
                        Page {data.page} of {data.totalPages}
                     </span>
                     {data.page < data.totalPages && (
                        <s-button
                           onClick={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set("page", String(data.page + 1));
                              window.location.assign(url.toString());
                           }}
                        >
                           Next →
                        </s-button>
                     )}
                  </div>
               )}
            </div>
         </s-card>
      </s-section>
    </s-page>
  );
}

function badgeColor(action: string): string {
  const colors: Record<string, string> = {
    suspend_shop: "danger",
    unsuspend_shop: "success",
    change_plan: "purple",
    reset_credits: "info",
    delete_shop_data: "danger",
    change_global_model: "warning",
    change_shop_model: "orange",
  };
  return colors[action] ?? "neutral";
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
