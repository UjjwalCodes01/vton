import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { actorFrom, adminError, adminJson, AdminApiError, requireAdminToken } from "../admin/api.server";
import { runStoreAction, storeDetail, type AdminAction } from "../admin/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const shop = new URL(request.url).searchParams.get("shop") || "";
    if (!shop) throw new AdminApiError(400, "A shop is required.");
    return adminJson(await storeDetail(shop));
  } catch (error) {
    return adminError(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const shop = String(body.shop || "");
    const act = String(body.action || "") as AdminAction;
    if (!shop || !act) throw new AdminApiError(400, "A shop and an action are required.");

    const result = await runStoreAction({
      shop,
      action: act,
      actor: actorFrom(request, body),
      payload: body,
    });
    return adminJson(result);
  } catch (error) {
    return adminError(error);
  }
};
