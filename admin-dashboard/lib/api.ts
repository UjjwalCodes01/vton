// The dashboard's only link to the product's data.
//
// Every call is server-to-server with the shared admin token; the browser never
// sees it and never talks to the backend directly. The signed-in operator's
// address rides along so the product's audit log names a person, not a service.

const BASE = (process.env.CLOTHSY_API_BASE || "https://fabricvton-api.onrender.com").replace(/\/+$/, "");
const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, options: { method?: string; body?: unknown; actor?: string } = {}): Promise<T> {
  const token = process.env.ADMIN_API_TOKEN || "";
  if (!token) throw new ApiError(500, "ADMIN_API_TOKEN is not set on the dashboard.");

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (options.actor) headers["X-Admin-Actor"] = options.actor;
  if (options.body) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // A cold instance or a dropped connection should read as "the API is not
    // answering", not as a stack trace in the operator's face.
    throw new ApiError(502, `Could not reach the Clothsy AI API (${(error as Error).name}).`);
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(response.status, "The API returned something that wasn't JSON.");
  }

  if (!response.ok) throw new ApiError(response.status, (data.error as string) || `Request failed (${response.status}).`);
  return data as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const api = {
  overview: <T>() => call<T>("/api/admin/overview"),
  stores: <T>(params: Record<string, string | number | undefined>) => call<T>(`/api/admin/stores${query(params)}`),
  store: <T>(shop: string) => call<T>(`/api/admin/store${query({ shop })}`),
  analytics: <T>(days: number) => call<T>(`/api/admin/analytics${query({ days })}`),
  audit: <T>(page: number) => call<T>(`/api/admin/audit${query({ page })}`),
  failures: <T>(page: number) => call<T>(`/api/admin/failures${query({ page })}`),
  act: <T>(shop: string, action: string, payload: Record<string, unknown>, actor: string) =>
    call<T>("/api/admin/store", { method: "POST", actor, body: { shop, action, actor, ...payload } }),
  invoices: <T>(shop?: string) => call<T>(`/api/admin/invoices${query({ shop })}`),
  invoiceAct: <T>(payload: Record<string, unknown>, actor: string) =>
    call<T>("/api/admin/invoices", { method: "POST", actor, body: { actor, ...payload } }),
};
