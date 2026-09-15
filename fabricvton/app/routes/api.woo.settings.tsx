import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { parseJsonBody, verifySignedRequest, WooAuthError } from "../woo/auth.server";
import { methodNotAllowed, wooError, wooJson } from "../woo/http.server";

/** The on/off switch. Appearance settings live in WordPress, not here. */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return methodNotAllowed();

  try {
    const { store, body } = await verifySignedRequest(request);
    const data = parseJsonBody(body);
    if (typeof data.isEnabled !== "boolean") {
      throw new WooAuthError(400, "isEnabled must be true or false", "bad_input");
    }
    const updated = await db.shopConfig.update({
      where: { shop: store.shop },
      data: { isEnabled: data.isEnabled },
      select: { isEnabled: true },
    });
    return wooJson(updated);
  } catch (error) {
    return wooError(error, "settings");
  }
};

export const loader = () => methodNotAllowed();
