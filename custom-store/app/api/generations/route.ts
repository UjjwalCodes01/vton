import { getPortalSession } from "@/lib/session";
import { api, ApiError } from "@/lib/api";

/** Deletes one try-on from the Generations page. */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const body = await request.json() as { action?: string; id?: string };
    if (body.action === "delete") return Response.json(await api.deleteGeneration(session, String(body.id || "")), { headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Request failed." }, { status: error instanceof ApiError ? error.status : 500 });
  }
}
