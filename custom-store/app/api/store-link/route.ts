import { getPortalSession } from "@/lib/session";
import { api, ApiError } from "@/lib/api";

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const body = await request.json() as { platform?: string; storeUrl?: string };
    return Response.json(await api.startStoreLink(session, String(body.platform || ""), String(body.storeUrl || "")), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Could not start connection." }, { status: error instanceof ApiError ? error.status : 500 });
  }
}
