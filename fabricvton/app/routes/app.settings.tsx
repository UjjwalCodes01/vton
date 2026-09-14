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
import { themeEditorProductUrl } from "../theme-editor.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config =
    (await db.shopConfig.findUnique({ where: { shop } })) ??
    (await db.shopConfig.create({ data: { shop } }));

  return {
    isEnabled: config.isEnabled,
    themeEditorUrl: themeEditorProductUrl(shop),
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

  return { isEnabled };
};

export default function Settings() {
  const { isEnabled, themeEditorUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const isSaving = fetcher.state !== "idle";
  const result = fetcher.data;

  useEffect(() => {
    if (result) {
      shopify.toast.show(result.isEnabled ? "Virtual try-on turned on" : "Virtual try-on turned off");
    }
  }, [result, shopify]);

  // The theme editor is a top-level admin page, so it must replace the admin
  // frame rather than load inside the app's iframe.
  const openThemeEditor = () => window.open(themeEditorUrl, "_top");

  // A single on/off setting that applies immediately: a status plus one action
  // button, rather than a form with a separate Save step.
  return (
    <s-page heading="Settings">
      <s-section heading="Virtual try-on">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-text type="strong">Virtual try-on</s-text>
              <s-badge tone={isEnabled ? "success" : "neutral"}>{isEnabled ? "On" : "Off"}</s-badge>
            </s-stack>
            <s-text color="subdued">
              When off, shoppers can&apos;t start a try-on, even if the button is
              still in your theme.
            </s-text>
          </s-stack>
          <fetcher.Form method="post">
            <input type="hidden" name="isEnabled" value={isEnabled ? "false" : "true"} />
            <s-button type="submit" loading={isSaving} variant={isEnabled ? "secondary" : "primary"}>
              {isEnabled ? "Turn off" : "Turn on"}
            </s-button>
          </fetcher.Form>
        </s-stack>
      </s-section>

      <s-section heading="Button appearance">
        <s-stack gap="base">
          <s-paragraph>
            The button&apos;s text, colors, corner radius, and whether shoppers
            must enter an email are set on the Clothsy AI Try-On block in your
            theme, so you can preview changes on your real product page before
            publishing.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>Button text and colors</s-list-item>
            <s-list-item>Corner radius</s-list-item>
            <s-list-item>Require an email before the try-on</s-list-item>
            <s-list-item>Where the button sits on the product page</s-list-item>
          </s-unordered-list>
          <s-stack direction="inline">
            <s-button onClick={openThemeEditor}>Open theme editor</s-button>
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
