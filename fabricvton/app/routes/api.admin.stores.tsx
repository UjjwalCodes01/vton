import type { LoaderFunctionArgs } from "react-router";
import { adminError, adminJson, requireAdminToken } from "../admin/api.server";
import { listStores } from "../admin/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const url = new URL(request.url);
    return adminJson(
      await listStores({
        q: url.searchParams.get("q")?.slice(0, 120) || undefined,
        platform: url.searchParams.get("platform") || undefined,
        plan: url.searchParams.get("plan") || undefined,
        status: url.searchParams.get("status") || undefined,
        page: Number(url.searchParams.get("page") || 1),
      }),
    );
  } catch (error) {
    return adminError(error);
  }
};
