import type { LoaderFunctionArgs } from "react-router";
import { adminError, adminJson, requireAdminToken } from "../admin/api.server";
import { auditLog } from "../admin/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const page = Number(new URL(request.url).searchParams.get("page") || 1);
    return adminJson(await auditLog(page));
  } catch (error) {
    return adminError(error);
  }
};
