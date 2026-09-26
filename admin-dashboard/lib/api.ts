import "server-only";
import { redactSecrets } from "./format";

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

  if (!response.ok) {
    // This text reaches the browser through action state, so keep it short and
    // free of anything credential-shaped.
    const message = typeof data.error === "string" ? redactSecrets(data.error, 200) : "";
    throw new ApiError(response.status, message || `Request failed (${response.status}).`);
  }
  return stripSecrets(data) as T;
}

// The backend returns whole rows in places (the store detail spreads the full
// store record, including the encrypted site secret, the Klaviyo key and the
// subscription's checkout token). None of that is ever shown here, so drop any
// credential-shaped key before the data reaches a page or a client component.
const isSecretKey = (key: string) => /secret|token|password|api_?key/i.test(key) || /Enc$/.test(key);

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => !isSecretKey(key)).map(([key, item]) => [key, stripSecrets(item)]),
    );
  }
  return value;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

// Keys the server decides; a form field with one of these names is dropped.
// (Invoice forms legitimately send their own shop and action, so only `actor`
// is reserved there.)
const RESERVED = ["shop", "action", "actor"];

function without(payload: Record<string, unknown>, drop: string[]) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !drop.includes(key)));
}

export const api = {
  overview: <T>() => call<T>("/api/admin/overview"),
  stores: <T>(params: Record<string, string | number | undefined>) => call<T>(`/api/admin/stores${query(params)}`),
  store: <T>(shop: string) => call<T>(`/api/admin/store${query({ shop })}`),
  analytics: <T>(days: number) => call<T>(`/api/admin/analytics${query({ days })}`),
  audit: <T>(page: number) => call<T>(`/api/admin/audit${query({ page })}`),
  failures: <T>(page: number) => call<T>(`/api/admin/failures${query({ page })}`),
  // Server-derived fields go last so nothing in a form can override them.
  act: <T>(shop: string, action: string, payload: Record<string, unknown>, actor: string) =>
    call<T>("/api/admin/store", { method: "POST", actor, body: { ...without(payload, RESERVED), shop, action, actor } }),
  invoices: <T>(shop?: string) => call<T>(`/api/admin/invoices${query({ shop })}`),
  invoiceAct: <T>(payload: Record<string, unknown>, actor: string) =>
    call<T>("/api/admin/invoices", { method: "POST", actor, body: { ...without(payload, ["actor"]), actor } }),
};
