// The portal's link to Clothsy AI.
//
// Everything runs server-side: the merchant's portal session travels in the
// request body to the backend, and the browser never holds anything that could
// be replayed against the API directly.

const BASE = (process.env.CLOTHSY_API_BASE || "https://fabricvton-api.onrender.com").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(502, `Could not reach Clothsy AI (${(error as Error).name}).`);
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(response.status, "Clothsy AI returned an unexpected response.");
  }
  if (!response.ok) throw new ApiError(response.status, (data.error as string) || `Request failed (${response.status}).`);
  return data as T;
}

export interface PortalData {
  store: {
    shop: string;
    name: string;
    platform: string;
    plan: string;
    planCredits: number;
    allowance: number;
    topUpCredits: number;
    used: number;
    cycleStart: string;
    isSuspended: boolean;
  };
  invoices: {
    id: string;
    credits: number;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
  payments: { enabled: boolean; keyId: string };
}

export const api = {
  /** Swaps the one-time handoff token from Shopify for a portal session. */
  exchange: (token: string) => post<{ shop: string; session: string }>("/api/portal/session", { token }),
  me: (session: string) => post<PortalData>("/api/portal/me", { session }),
  startPayment: (session: string, invoiceId: string) =>
    post<{ orderId: string; keyId: string; amount: number; currency: string; description: string }>(
      "/api/portal/pay",
      { session, invoiceId, step: "start" },
    ),
  confirmPayment: (session: string, invoiceId: string, fields: Record<string, string>) =>
    post<{ ok: boolean; credits: number; message: string }>("/api/portal/pay", {
      session,
      invoiceId,
      step: "confirm",
      ...fields,
    }),
};
