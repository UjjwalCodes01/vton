import "server-only";

// The portal's link to Clothsy AI.
//
// Everything runs server-side: the merchant's portal session travels in the
// request body to the backend, and the browser never holds anything that could
// be replayed against the API directly.

const BASE = (process.env.CLOTHSY_API_BASE || "https://api.clothsyai.fabricvton.com").replace(/\/+$/, "");

/** Where "Continue with Google" points. The exchange happens server-side there. */
export const googleSignInUrl = `${BASE}/auth/google/start`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function post<T>(path: string, body: Record<string, unknown>, timeoutMs = 20_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
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

export interface StoreSummary {
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
  isEnabled: boolean;
}

export interface PortalData {
  account: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    credits: number;
    isPlaceholder: boolean;
  };
  stores: StoreSummary[];
  stats: { tryOnsThisMonth: number };
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

export interface Generations {
  page: number;
  pages: number;
  total: number;
  generations: {
    id: string;
    shop: string;
    status: string;
    productTitle: string | null;
    createdAt: string;
    seconds: number | null;
    rating: string | null;
    imageUrl: string | null;
    /** Finished, but older than the 24 hours its image can be fetched for. */
    imageExpired?: boolean;
  }[];
}

export interface ApiKeyData {
  credits: number;
  keys: { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; credits?: number | null; issuedBy?: string }[];
  runs: { id: string; state: string; runId: string | null; createdAt: string }[];
}

export const api = {
  /** Swaps the one-time handoff token from Shopify for a portal session. */
  exchange: (token: string) =>
    post<{ shop?: string; email?: string; session: string; bind?: string | null }>("/api/portal/session", { token }),
  /** Ends every session this account holds, not just this browser's cookie. */
  signOut: (session: string) => post<{ ok: boolean }>("/api/portal/signout", { session }),
  // Starting screens both photos and uploads the garment before it answers, and
  // spends the credit part-way through; give it longer than other calls so a slow
  // start isn't reported as a failure after the credit is gone. Stays under the
  // load balancer's 60-second idle timeout.
  playgroundStart: (session: string, payload: { personImage: string; garmentImage: string; title: string; consent: boolean }) =>
    post<{ taskId: string; creditsLeft: number }>("/api/portal/playground", {
      session,
      step: "start",
      ...payload,
    }, 55_000),
  playgroundStatus: (session: string, taskId: string) =>
    post<{ status: "pending" | "success" | "failed"; imageToken?: string; message?: string }>(
      "/api/portal/playground",
      { session, step: "status", taskId },
    ),
  generations: (session: string, page = 1, shop?: string) =>
    post<Generations>("/api/portal/generations", { session, page, shop }),
  deleteGeneration: (session: string, id: string) =>
    post<{ deleted: boolean }>("/api/portal/generations", { session, step: "delete", id }),
  me: (session: string) => post<PortalData>("/api/portal/me", { session }),
  keys: (session: string) => post<ApiKeyData>("/api/portal/keys", { session, step: "list" }),
  createKey: (session: string, name: string) => post<{ key: ApiKeyData["keys"][number]; token: string; freeCreditsGranted: number }>("/api/portal/keys", { session, step: "create", name }),
  revokeKey: (session: string, id: string) => post<ApiKeyData>("/api/portal/keys", { session, step: "revoke", id }),
  startStoreLink: (session: string, platform: string, storeUrl: string) =>
    post<{ code: string; adminUrl: string; expiresMinutes: number }>("/api/portal/store-link", { session, platform, storeUrl }),
  startPayment: (session: string, invoiceId: string) =>
    post<{ orderId: string; keyId: string; amount: number; currency: string; description: string }>(
      "/api/portal/pay",
      { session, invoiceId, step: "start" },
    ),
  confirmPayment: (session: string, invoiceId: string, fields: Record<string, string>) =>
    post<{ ok: boolean; credits?: number; message: string; pending?: boolean }>("/api/portal/pay", {
      session,
      invoiceId,
      step: "confirm",
      ...fields,
    }),
};
