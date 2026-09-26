import type { LoaderFunctionArgs } from "react-router";
import { getObject } from "../share/storage.server";
import { readGarmentToken } from "../invoices/playground.server";

/**
 * Serves one uploaded Playground garment.
 *
 * Public by necessity — the generator fetches it — so the token is signed and
 * expires after two hours, and the key it names is one we minted. Nothing here
 * takes a path from the caller.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const key = readGarmentToken(params.token || "");
  if (!key || !key.startsWith("looks/playground/")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getObject(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": object.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
