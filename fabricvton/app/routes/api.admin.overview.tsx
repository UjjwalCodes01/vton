import type { LoaderFunctionArgs } from "react-router";
import { adminError, adminJson, requireAdminToken } from "../admin/api.server";
import { overview } from "../admin/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    return adminJson(await overview());
  } catch (error) {
    return adminError(error);
  }
};
