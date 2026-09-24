import type { LoaderFunctionArgs } from "react-router";
import { adminError, adminJson, requireAdminToken } from "../admin/api.server";
import { analytics } from "../admin/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const days = Number(new URL(request.url).searchParams.get("days") || 30);
    return adminJson(await analytics(days));
  } catch (error) {
    return adminError(error);
  }
};
