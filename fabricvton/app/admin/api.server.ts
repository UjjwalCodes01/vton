// Authentication for the standalone admin dashboard.
//
// The dashboard is a separate service on its own domain; it never touches the
// database directly. It calls these endpoints server-to-server with a shared
// bearer token, so the token lives only in two sets of environment variables
// and never reaches a browser.
//
// Who the human was is a separate question, answered by the dashboard's own
// login. It passes that along as `actor` purely so the audit log can name them.

import { timingSafeEqual } from "node:crypto";

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function tokenMatches(presented: string) {
  const expected = process.env.ADMIN_API_TOKEN || "";
  // Fails closed: with no token configured the API is off, not open.
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Throws unless the request carries the shared token. */
export function requireAdminToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented || !tokenMatches(presented)) {
    throw new AdminApiError(401, "Not authorised.");
  }
}

/** Who to record in the audit log, as claimed by the authenticated dashboard. */
export function actorFrom(request: Request, body?: Record<string, unknown>) {
  const claimed =
    (typeof body?.actor === "string" && body.actor) ||
    request.headers.get("X-Admin-Actor") ||
    "";
  const actor = claimed.slice(0, 120).trim();
  return actor ? `dashboard:${actor}` : "dashboard";
}

export function adminJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function adminError(error: unknown) {
  if (error instanceof AdminApiError) {
    return adminJson({ error: error.message }, error.status);
  }
  console.error("[AdminAPI]", error);
  return adminJson({ error: "Something went wrong." }, 500);
}
