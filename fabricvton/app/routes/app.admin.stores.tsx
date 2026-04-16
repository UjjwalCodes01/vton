import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, Form, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { Prisma } from "@prisma/client";
import db from "../db.server";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.toLowerCase() || "";
  const filterPlan = url.searchParams.get("plan") || "";
  const filterSuspended = url.searchParams.get("suspended");

  const where: Prisma.ShopConfigWhereInput = {};
  if (search) {
    where.shop = { contains: search };
  }
  if (filterPlan) {
    where.plan = filterPlan;
  }
  if (filterSuspended === "true") {
    where.isSuspended = true;
  }

  const stores = await db.shopConfig.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { stores, search, filterPlan, filterSuspended: filterSuspended === "true" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const targetShop = String(formData.get("targetShop"));

  if (!targetShop) {
    return { error: "No target shop specified." };
  }

  switch (intent) {
    case "suspend": {
      const reason = String(formData.get("reason") || "Suspended by admin");
      await db.shopConfig.update({
        where: { shop: targetShop },
        data: { isSuspended: true, suspendReason: reason },
      });
      await db.adminAuditLog.create({
        data: {
          adminShop: session.shop,
          action: "suspend_shop",
          targetShop,
          details: JSON.stringify({ reason }),
        },
      });
      return { success: true, message: `${targetShop} suspended.` };
    }

    case "unsuspend": {
      await db.shopConfig.update({
        where: { shop: targetShop },
        data: { isSuspended: false, suspendReason: null },
      });
      await db.adminAuditLog.create({
        data: {
          adminShop: session.shop,
          action: "unsuspend_shop",
          targetShop,
        },
      });
      return { success: true, message: `${targetShop} unsuspended.` };
    }

    case "change_plan": {
      const newPlan = String(formData.get("newPlan"));
      const planCredits: Record<string, number> = {
        free: 25,
        starter: 100,
        growth: 500,
        pro: 3000,
      };
      await db.shopConfig.update({
        where: { shop: targetShop },
        data: {
          plan: newPlan,
          monthlyCredits: planCredits[newPlan] ?? 25,
        },
      });
      await db.adminAuditLog.create({
        data: {
          adminShop: session.shop,
          action: "change_plan",
          targetShop,
          details: JSON.stringify({ newPlan }),
        },
      });
      return { success: true, message: `${targetShop} plan changed to ${newPlan}.` };
    }

    case "reset_credits": {
      await db.shopConfig.update({
        where: { shop: targetShop },
        data: { creditsUsed: 0 },
      });
      await db.adminAuditLog.create({
        data: {
          adminShop: session.shop,
          action: "reset_credits",
          targetShop,
        },
      });
      return { success: true, message: `Credits reset for ${targetShop}.` };
    }

    case "delete_shop_data": {
      await Promise.all([
        db.lead.deleteMany({ where: { shop: targetShop } }),
        db.tryOnEvent.deleteMany({ where: { shop: targetShop } }),
        db.analyticsDaily.deleteMany({ where: { shop: targetShop } }),
        db.shopConfig.deleteMany({ where: { shop: targetShop } }),
      ]);
      await db.adminAuditLog.create({
        data: {
          adminShop: session.shop,
          action: "delete_shop_data",
          targetShop,
        },
      });
      return { success: true, message: `All data deleted for ${targetShop}.` };
    }

    default:
      return { error: `Unknown action: ${intent}` };
  }
};

export default function AdminStores() {
  const { stores, search, filterPlan, filterSuspended } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const submit = useSubmit();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.success });
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="🏪 All Stores">
      {/* Search */}
      <s-section heading="Installed Stores">
        <s-card>
          <div style={{ padding: "20px" }}>
            <Form method="get" className="fv-filter-bar fv-mb-md" onChange={(e) => submit(e.currentTarget)}>
               <input
                 name="q"
                 type="search"
                 placeholder="Search shop domain..."
                 defaultValue={search}
                 className="fv-input"
                 style={{ minWidth: "250px" }}
               />
               <select
                 name="plan"
                 className="fv-select"
                 defaultValue={filterPlan}
               >
                 <option value="">All Plans</option>
                 <option value="free">Free</option>
                 <option value="starter">Starter</option>
                 <option value="growth">Growth</option>
                 <option value="pro">Pro</option>
               </select>
               <label className="fv-flex fv-items-center fv-gap-sm" style={{ cursor: "pointer", marginLeft: "12px", height: "40px" }}>
                 <input type="checkbox" name="suspended" value="true" defaultChecked={filterSuspended} />
                 <span>Suspended only</span>
               </label>
            </Form>

            {stores.length === 0 ? (
               <div className="fv-empty-state">
                  <div className="icon">🏪</div>
                  <h3>No Stores Found</h3>
                  <p>Check your spelling or adjust active filters.</p>
               </div>
            ) : (
               <div style={{ overflowX: "auto" }}>
                  <table className="fv-table">
                  <thead>
                     <tr>
                        <th>Shop</th>
                        <th>Plan</th>
                        <th>Credits</th>
                        <th>Status</th>
                        <th>Installed</th>
                        <th>Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {stores.map((store) => (
                        <tr key={store.id}>
                        <td><strong>{store.shop}</strong></td>
                        <td>
                           <span className={`fv-badge ${store.plan === 'free' ? 'neutral' : 'purple'}`}>
                              {store.plan.toUpperCase()}
                           </span>
                        </td>
                        <td>
                           {store.creditsUsed} / {store.monthlyCredits}
                        </td>
                        <td>
                           {store.isSuspended ? (
                              <span className="fv-badge danger">🚫 Suspended</span>
                           ) : store.isEnabled ? (
                              <span className="fv-badge success">✅ Active</span>
                           ) : (
                              <span className="fv-badge warning">⏸ Disabled by Store</span>
                           )}
                        </td>
                        <td>{new Date(store.installedAt).toLocaleDateString()}</td>
                        <td>
                           <div className="fv-flex fv-gap-sm fv-flex-wrap">
                              {/* Suspend / Unsuspend */}
                              {store.isSuspended ? (
                              <fetcher.Form method="post">
                                 <input type="hidden" name="intent" value="unsuspend" />
                                 <input type="hidden" name="targetShop" value={store.shop} />
                                 <button type="submit" className="fv-action-btn success">Unsuspend</button>
                              </fetcher.Form>
                              ) : (
                              <fetcher.Form method="post" onSubmit={(e) => {
                                 if (!confirm(`Are you sure you want to suspend ${store.shop}?`)) e.preventDefault();
                              }}>
                                 <input type="hidden" name="intent" value="suspend" />
                                 <input type="hidden" name="targetShop" value={store.shop} />
                                 <input type="hidden" name="reason" value="Policy violation" />
                                 <button type="submit" className="fv-action-btn danger">Suspend</button>
                              </fetcher.Form>
                              )}

                              {/* Reset Credits */}
                              <fetcher.Form method="post">
                              <input type="hidden" name="intent" value="reset_credits" />
                              <input type="hidden" name="targetShop" value={store.shop} />
                              <button type="submit" className="fv-action-btn info">Reset Credits</button>
                              </fetcher.Form>

                              {/* Change Plan */}
                              <fetcher.Form method="post" className="fv-flex fv-gap-sm">
                              <input type="hidden" name="intent" value="change_plan" />
                              <input type="hidden" name="targetShop" value={store.shop} />
                              <select
                                 name="newPlan"
                                 defaultValue={store.plan}
                                 className="fv-select"
                                 style={{ padding: "4px 8px" }}
                              >
                                 <option value="free">Free</option>
                                 <option value="starter">Starter</option>
                                 <option value="growth">Growth</option>
                                 <option value="pro">Pro</option>
                              </select>
                              <button type="submit" className="fv-action-btn purple">Set Plan</button>
                              </fetcher.Form>
                           </div>
                        </td>
                        </tr>
                     ))}
                  </tbody>
                  </table>
               </div>
            )}
          </div>
        </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
