import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { isSuperAdmin } from "../admin.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    showSuperAdmin: isSuperAdmin(shop),
  };
};

export default function App() {
  const { apiKey, showSuperAdmin } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        {/* ── Merchant Admin ── */}
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/leads">Leads</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/billing">Billing</s-link>

        {/* ── Super Admin (only visible to admin shops) ── */}
        {showSuperAdmin && (
          <>
            <s-link href="/app/admin">⚡ Admin</s-link>
            <s-link href="/app/admin/stores">🏪 All Stores</s-link>
            <s-link href="/app/admin/global-analytics">📊 Global Analytics</s-link>
            <s-link href="/app/admin/model">🤖 Model Control</s-link>
            <s-link href="/app/admin/audit-log">📋 Audit Log</s-link>
          </>
        )}
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
