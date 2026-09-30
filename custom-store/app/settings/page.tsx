import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { count, day } from "@/lib/format";
import { PageHead, Shell } from "@/components/Shell";
import { StoreConnect } from "@/components/StoreConnect";

export default async function Settings() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/session/expired");
    throw error;
  }

  const { account, stores } = data;

  return (
    <Shell active="/settings" account={account}>
      <PageHead title="Stores & settings" subtitle="Connect a store, and see who this account belongs to." />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <h2>Connected stores</h2>
          <span className="badge">{count(stores.length)}</span>
        </div>
        <div className="card-body flush">
          {stores.length === 0 ? (
            <p className="empty">No stores connected yet.</p>
          ) : (
            stores.map((store) => (
              <div className="row-item" key={store.shop}>
                <div className="row-main" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="store-logo">{store.name.charAt(0).toUpperCase()}</span>
                  <span>
                    <b>{store.name}</b>
                    <p className="mono">{store.shop}</p>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="badge">{store.platform === "woocommerce" ? "WooCommerce" : "Shopify"}</span>
                  <span className="badge violet">{store.plan}</span>
                  <span className="sub nowrap">since {day(store.cycleStart)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <StoreConnect />

      <div className="card">
        <div className="card-head"><h2>Account</h2></div>
        <div className="card-body">
          <div className="grid cols-2">
            <div>
              <span className="stat-label">Email</span>
              <p style={{ margin: "6px 0 0", fontSize: 14.5 }}>
                {account.isPlaceholder ? (
                  <span className="sub">
                    Not set — this account was created by your store. Sign in with Google to attach
                    your own address.
                  </span>
                ) : (
                  account.email
                )}
              </p>
            </div>
            <div>
              <span className="stat-label">Account credits</span>
              <p style={{ margin: "6px 0 0", fontSize: 14.5 }}>
                  {count(account.credits)}{" "}
                  <span className="sub">— shared by the Playground and Developer API</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
