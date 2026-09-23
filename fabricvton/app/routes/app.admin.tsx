import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { requireSuperAdmin } from "../admin.server";

/**
 * Layout for every super-admin screen.
 *
 * It exists to render an Outlet and to gate the whole branch in one place.
 * Without the Outlet — which is how this started — every child URL rendered
 * this file's own page instead, so All Stores, Global Analytics, Model Control
 * and the Audit Log all showed the dashboard.
 *
 * The children re-check `requireSuperAdmin` in their own loaders and actions;
 * this is the outer fence, not the only one.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  requireSuperAdmin(session.shop);
  return null;
};

export default function AdminLayout() {
  return <Outlet />;
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
