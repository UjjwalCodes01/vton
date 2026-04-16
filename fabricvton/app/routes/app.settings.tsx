import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import db from "../db.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let config = await db.shopConfig.findUnique({ where: { shop } });
  if (!config) {
    config = await db.shopConfig.create({ data: { shop } });
  }

  return { config };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const isEnabled = formData.get("isEnabled") === "true";
  const buttonText = String(formData.get("buttonText") || "Try It On");
  const buttonColor = String(formData.get("buttonColor") || "#000000");
  const buttonTextColor = String(formData.get("buttonTextColor") || "#ffffff");
  const buttonBorderRadius = String(
    formData.get("buttonBorderRadius") || "4px"
  );
  const requireEmailCapture = formData.get("requireEmailCapture") === "true";

  await db.shopConfig.upsert({
    where: { shop },
    create: {
      shop,
      isEnabled,
      buttonText,
      buttonColor,
      buttonTextColor,
      buttonBorderRadius,
      requireEmailCapture,
    },
    update: {
      isEnabled,
      buttonText,
      buttonColor,
      buttonTextColor,
      buttonBorderRadius,
      requireEmailCapture,
    },
  });

  return { success: true };
};

export default function Settings() {
  const { config } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const isSaving = fetcher.state !== "idle";
  const saved = fetcher.data?.success;

  // Local state for live preview
  const [btnText, setBtnText] = useState(config.buttonText);
  const [btnBg, setBtnBg] = useState(config.buttonColor);
  const [btnTextCol, setBtnTextCol] = useState(config.buttonTextColor);
  const [btnRadius, setBtnRadius] = useState(config.buttonBorderRadius);

  useEffect(() => {
    if (saved) {
      shopify.toast.show("Settings saved successfully!");
    }
  }, [saved, shopify]);

  return (
    <s-page heading="Widget Settings">
      <fetcher.Form method="post">
        
        <s-section heading="App Status">
          <s-card>
            <div style={{ padding: "20px" }}>
              <div className="fv-section-title">
                 <span className="icon">🟢</span> Enable / Disable Widget
              </div>
              <p className="fv-text-subdued fv-mb-md">
                 Control whether the Virtual Try-On button appears on your storefront product pages.
              </p>
              <select 
                 name="isEnabled" 
                 className="fv-select"
                 defaultValue={config.isEnabled ? "true" : "false"}
                 style={{ minWidth: "200px" }}
              >
                 <option value="true">Enabled (Visible to customers)</option>
                 <option value="false">Disabled (Hidden)</option>
              </select>
            </div>
          </s-card>
        </s-section>

        <s-section heading="Lead Generation">
          <s-card>
             <div style={{ padding: "20px" }}>
               <div className="fv-section-title">
                  <span className="icon">📧</span> Email Capture Requirement
               </div>
               <p className="fv-text-subdued fv-mb-md">
                  When enabled, customers must enter their email before generating a try-on image.
               </p>
               <select 
                  name="requireEmailCapture" 
                  className="fv-select"
                  defaultValue={config.requireEmailCapture ? "true" : "false"}
                  style={{ minWidth: "200px" }}
               >
                  <option value="true">Require email (Recommended)</option>
                  <option value="false">Skip email capture</option>
               </select>
             </div>
          </s-card>
        </s-section>

        <s-section heading="Button Customization">
          <s-card>
             <div style={{ padding: "20px" }}>
               <div className="fv-flex fv-flex-wrap" style={{ gap: "32px", alignItems: "flex-start" }}>
                  
                  {/* Form Controls */}
                  <div style={{ flex: "1 1 300px" }}>
                     <div className="fv-mb-md">
                        <label htmlFor="button-text" className="fv-text-sm fv-text-subdued" style={{ display: "block", marginBottom: "8px" }}>
                           Button Text
                        </label>
                        <input
                           id="button-text"
                           name="buttonText"
                           type="text"
                           value={btnText}
                           onChange={(e) => setBtnText(e.target.value)}
                           className="fv-input"
                           placeholder="Try It On"
                        />
                     </div>

                     <div className="fv-flex fv-gap-md fv-mb-md">
                        <div style={{ flex: 1 }}>
                           <label htmlFor="bg-color-picker" className="fv-text-sm fv-text-subdued" style={{ display: "block", marginBottom: "8px" }}>
                              Background Color
                           </label>
                           <div className="fv-color-preview">
                              <input
                                 name="buttonColor"
                                 type="color"
                                 value={btnBg}
                                 onChange={(e) => setBtnBg(e.target.value)}
                                 style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                                 id="bg-color-picker"
                              />
                              <label aria-label="Choose background color" htmlFor="bg-color-picker" className="fv-color-swatch" style={{ backgroundColor: btnBg }}></label>
                              <span className="fv-text-sm">{btnBg}</span>
                           </div>
                        </div>

                        <div style={{ flex: 1 }}>
                           <label htmlFor="text-color-picker" className="fv-text-sm fv-text-subdued" style={{ display: "block", marginBottom: "8px" }}>
                              Text Color
                           </label>
                           <div className="fv-color-preview">
                              <input
                                 name="buttonTextColor"
                                 type="color"
                                 value={btnTextCol}
                                 onChange={(e) => setBtnTextCol(e.target.value)}
                                 style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                                 id="text-color-picker"
                              />
                              <label aria-label="Choose text color" htmlFor="text-color-picker" className="fv-color-swatch" style={{ backgroundColor: btnTextCol }}></label>
                              <span className="fv-text-sm">{btnTextCol}</span>
                           </div>
                        </div>
                     </div>

                     <div className="fv-mb-md">
                        <label htmlFor="button-border-radius" className="fv-text-sm fv-text-subdued" style={{ display: "block", marginBottom: "8px" }}>
                           Border Radius (e.g., 4px, 20px)
                        </label>
                        <input
                           id="button-border-radius"
                           name="buttonBorderRadius"
                           type="text"
                           value={btnRadius}
                           onChange={(e) => setBtnRadius(e.target.value)}
                           className="fv-input"
                           style={{ width: "120px" }}
                        />
                     </div>
                  </div>

                  {/* Live Preview */}
                  <div style={{ flex: "1 1 300px" }}>
                     <div className="fv-text-sm fv-text-subdued" style={{ display: "block", marginBottom: "8px" }}>
                        Live Preview
                     </div>
                     <div className="fv-widget-preview">
                        <div 
                           className="fv-widget-preview-btn"
                           style={{ 
                              backgroundColor: btnBg, 
                              color: btnTextCol, 
                              borderRadius: btnRadius 
                           }}
                        >
                           ✨ {btnText}
                        </div>
                        <p className="fv-text-sm fv-text-subdued fv-mt-md">
                           This is how the button will appear on your product pages.
                        </p>
                     </div>
                  </div>
               </div>
             </div>
          </s-card>
        </s-section>

        <s-card>
           <div style={{ padding: "16px", textAlign: "right" }}>
              <s-button type="submit" loading={isSaving} variant="primary">
              {saved ? "Saved Successfully" : "Save Settings"}
              </s-button>
           </div>
        </s-card>

      </fetcher.Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
