import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import db from "../db.server";
import { getAccountInfo, checkCredits } from "../genlook.server";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  // Get current global defaults
  const defaultConfig = await db.shopConfig.findFirst({
    orderBy: { createdAt: "asc" },
    select: { modelProvider: true, modelVersion: true },
  });

  // GenLook account health
  let genlookAccount: Record<string, unknown> | null = null;
  let genlookCredits = -1;
  try {
    genlookAccount = await getAccountInfo();
    const c = await checkCredits();
    genlookCredits = c.credits;
  } catch {
    // API unreachable
  }

  // Count shops by model provider
  const providerDistribution = await db.shopConfig.groupBy({
    by: ["modelProvider"],
    _count: true,
  });

  return {
    currentProvider: defaultConfig?.modelProvider ?? "genlook",
    currentVersion: defaultConfig?.modelVersion ?? "v1",
    genlookAccount,
    genlookCredits,
    providerDistribution,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "update_global_model") {
    const newProvider = String(formData.get("modelProvider"));
    const newVersion = String(formData.get("modelVersion"));

    // Update ALL shops to the new model
    const result = await db.shopConfig.updateMany({
      data: {
        modelProvider: newProvider,
        modelVersion: newVersion,
      },
    });

    await db.adminAuditLog.create({
      data: {
        adminShop: session.shop,
        action: "change_global_model",
        details: JSON.stringify({
          newProvider,
          newVersion,
          shopsAffected: result.count,
        }),
      },
    });

    return {
      success: true,
      message: `Updated ${result.count} shops to ${newProvider} (v${newVersion}).`,
    };
  }

  return { error: "Unknown action.", success: false };
};

export default function ModelControl() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.message) {
       shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.success });
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="🤖 Model Control">
      <div className="fv-flex fv-gap-md fv-flex-wrap fv-items-start">
         <div style={{ flex: "1 1 400px" }}>
            {/* GenLook API Status */}
            <s-section heading="GenLook API Health">
               <s-card>
                  <div style={{ padding: "24px" }}>
                  {data.genlookCredits >= 0 ? (
                     <>
                        <div className="fv-flex fv-items-center fv-mb-md">
                           <span className="fv-status-dot connected"></span>
                           <span style={{ fontWeight: 600 }}>API Connected</span>
                        </div>
                        <div className="fv-text-sm fv-text-subdued fv-mb-sm">Credits Remaining</div>
                        <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }} className="accent">
                           {data.genlookCredits.toLocaleString()}
                        </div>
                        {data.genlookAccount && (
                           <div>
                              <div className="fv-text-sm fv-text-subdued fv-mb-sm">Account Payload</div>
                              <pre style={{
                                 margin: 0, 
                                 fontSize: "12px", 
                                 background: "var(--s-color-bg-surface-secondary)", 
                                 padding: "16px", 
                                 borderRadius: "8px", 
                                 overflow: "auto",
                                 border: "1px solid var(--s-color-border)"
                              }}>
                                 {JSON.stringify(data.genlookAccount, null, 2)}
                              </pre>
                           </div>
                        )}
                     </>
                  ) : (
                     <>
                        <div className="fv-flex fv-items-center fv-mb-md">
                           <span className="fv-status-dot suspended"></span>
                           <span style={{ fontWeight: 600 }}>API Unreachable</span>
                        </div>
                        <s-banner tone="critical">
                           <p>Cannot connect to GenLook API. Verify your GENLOOK_API_KEY in .env.</p>
                        </s-banner>
                     </>
                  )}
                  </div>
               </s-card>
            </s-section>
         </div>

         <div style={{ flex: "1 1 400px" }}>
            {/* Update Global Model */}
            <s-section heading="Model Configuration">
               <s-card>
                  <div style={{ padding: "24px" }}>
                     <div className="fv-section-title">Global Fallback Settings</div>
                     <p className="fv-text-subdued fv-text-sm fv-mb-md">
                        This operation forces <strong>all stores</strong> to use the selected provider and version.
                     </p>
                     
                     <fetcher.Form method="post" onSubmit={(e) => {
                        if (!confirm("Are you sure you want to enforce this model globally?")) e.preventDefault();
                     }}>
                        <input type="hidden" name="intent" value="update_global_model" />
                        
                        <div className="fv-mb-md">
                           <label htmlFor="model-provider" className="fv-text-sm fv-mb-sm" style={{ display: "block" }}>Provider Engine</label>
                           <select name="modelProvider" className="fv-select fv-w-full" defaultValue={data.currentProvider}>
                              <option hidden value={data.currentProvider}>{data.currentProvider}</option>
                              <option value="genlook">GenLook (Primary)</option>
                              <option value="replicate">Replicate (IDM-VTON)</option>
                              <option value="custom">Custom Node (GCP)</option>
                           </select>
                        </div>
                        
                        <div className="fv-mb-md">
                           <label htmlFor="model-version" className="fv-text-sm fv-mb-sm" style={{ display: "block" }}>Model Version Target</label>
                           <input
                              id="model-version"
                              name="modelVersion"
                              type="text"
                              defaultValue={data.currentVersion}
                              className="fv-input"
                           />
                        </div>
                        
                        <div style={{ textAlign: "right", marginTop: "24px" }}>
                           <s-button type="submit" variant="primary" loading={fetcher.state !== "idle"}>
                              Enforce Globally
                           </s-button>
                        </div>
                     </fetcher.Form>
                  </div>
               </s-card>
            </s-section>

            {/* Provider Distribution */}
            <s-section heading="Provider Usage Distribution">
               <s-card>
                  <table className="fv-table" style={{ borderCollapse: "collapse" }}>
                     <thead>
                     <tr>
                        <th>Provider Key</th>
                        <th style={{ textAlign: "right" }}>Stores Using</th>
                     </tr>
                     </thead>
                     <tbody>
                     {data.providerDistribution.map((p) => (
                        <tr key={p.modelProvider}>
                           <td><span className="fv-badge neutral">{p.modelProvider}</span></td>
                           <td style={{ textAlign: "right", fontWeight: "bold" }}>{p._count}</td>
                        </tr>
                     ))}
                     {data.providerDistribution.length === 0 && (
                        <tr><td colSpan={2} style={{ textAlign: "center", fontStyle: "italic" }}>No stores configured.</td></tr>
                     )}
                     </tbody>
                  </table>
               </s-card>
            </s-section>
         </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
