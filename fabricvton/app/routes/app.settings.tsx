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
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let config = await db.shopConfig.findUnique({ where: { shop } });
  if (!config) {
    config = await db.shopConfig.create({ data: { shop } });
  }

  return {
    shop,
    isEnabled: config.isEnabled,
    themeEditorUrl: `https://${shop}/admin/themes/current/editor?template=product`,
  };
};

// Only isEnabled is owned by the app. Everything about how the widget *looks*
// lives in the Theme Editor block settings, which is where Shopify expects
// storefront appearance to be configured.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const isEnabled = formData.get("isEnabled") === "true";

  await db.shopConfig.upsert({
    where: { shop },
    create: { shop, isEnabled },
    update: { isEnabled },
  });

  return { success: true };
};

export default function Settings() {
  const { isEnabled, themeEditorUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const isSaving = fetcher.state !== "idle";
  const saved = fetcher.data?.success;

  useEffect(() => {
    if (saved) {
      shopify.toast.show("Settings saved successfully!");
    }
  }, [saved, shopify]);

  // Break out of the embedded iframe so the Theme Editor opens at top level.
  const openThemeEditor = () => {
    window.open(themeEditorUrl, "_top");
  };

  return (
    <s-page heading="Settings">
      <fetcher.Form method="post">
        <s-section heading="App Status">
          <s-card>
            <div style={{ padding: "20px" }}>
              <div className="fv-section-title">
                <span className="icon">🟢</span> Enable / Disable Try-On
              </div>
              <p className="fv-text-subdued fv-mb-md">
                The master switch. When disabled, try-on requests are rejected even
                if the widget is still placed in your theme.
              </p>
              <select
                name="isEnabled"
                className="fv-select"
                defaultValue={isEnabled ? "true" : "false"}
                style={{ minWidth: "200px" }}
              >
                <option value="true">Enabled (Visible to customers)</option>
                <option value="false">Disabled (Hidden)</option>
              </select>
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

      <s-section heading="Widget Appearance">
        <s-card>
          <div style={{ padding: "20px" }}>
            <div className="fv-section-title">
              <span className="icon">🎨</span> Customized in the Theme Editor
            </div>
            <p className="fv-text-subdued fv-mb-md">
              Button text, colours, corner radius, and whether an email is required
              are all part of the FabricVTON block in your theme, so you can preview
              changes against your real product page before publishing.
            </p>

            <ul
              className="fv-text-sm"
              style={{ margin: "0 0 20px", paddingLeft: "20px", lineHeight: 2 }}
            >
              <li>Button text and colours</li>
              <li>Corner radius</li>
              <li>Require email before try-on</li>
              <li>Where the button sits on the product page</li>
            </ul>

            <s-button variant="primary" onClick={openThemeEditor}>
              Open Theme Editor
            </s-button>
            <span
              className="fv-text-sm fv-text-subdued"
              style={{ marginLeft: "12px" }}
            >
              Product template → the FabricVTON Try-On block
            </span>
          </div>
        </s-card>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
