"use server";

// Every mutation the dashboard can perform.
//
// These run on the server, read the session from the cookie, and forward to the
// product's admin API with the operator's address attached — so the product's
// own audit log records who did it, not just that "the dashboard" did.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { attemptSucceeded, authenticate, beginAttempt, endSession, getSession, startSession, tooManyAttempts } from "@/lib/auth";
import { headers } from "next/headers";

/** Drafting, sending and cancelling credit invoices. */
export async function invoiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Reload and sign in again." };

  // `actor` is the signed-in operator, never something the form can say.
  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key !== "actor") payload[key] = value;
  }
  // A checkbox is absent when unticked, so the default is decided here rather
  // than left to whatever the form happened to send.
  payload.send = form.get("send") !== "draft";

  try {
    const result = await api.invoiceAct<{ message: string }>(payload, session.email);
    revalidatePath("/", "layout");
    return { message: result.message };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "That did not work." };
  }
}

export interface ActionState {
  error?: string;
  message?: string;
  /** A key just issued — shown once, never stored by the dashboard. */
  issuedKey?: string;
}

// ─── Issued API keys ───────────────────────────────────────────────────────

export async function issueApiKey(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Sign in again." };

  // No email: a standalone key that belongs to nobody, managed only from here.
  if (!String(form.get("email") || "").trim()) {
    try {
      const result = await api.createStandaloneKey<{ key: { credits: number; name: string }; issuedKey?: string }>(
        { name: String(form.get("name") || ""), credits: Number(form.get("credits")), note: String(form.get("note") || "") },
        session.email,
      );
      revalidatePath("/keys");
      if (!result.issuedKey) return { error: "The key was created but couldn't be shown. Revoke it and generate another." };
      return {
        message: `Standalone key "${result.key.name}" with ${result.key.credits.toLocaleString("en-US")} try-ons.`,
        issuedKey: result.issuedKey,
      };
    } catch (error) {
      return { error: error instanceof ApiError ? error.message : "Could not generate the key." };
    }
  }

  try {
    const result = await api.issueKey<{ account: { email: string }; key: { prefix: string; credits: number }; issuedKey?: string }>(
      {
        email: String(form.get("email") || ""),
        name: String(form.get("name") || ""),
        credits: Number(form.get("credits")),
        note: String(form.get("note") || ""),
      },
      session.email,
    );
    revalidatePath("/accounts");
    revalidatePath("/keys");
    if (!result.issuedKey) return { error: "The key was created but couldn't be shown. Revoke it and issue another." };
    return {
      message: `Key for ${result.account.email} with ${result.key.credits.toLocaleString("en-US")} try-ons.`,
      issuedKey: result.issuedKey,
    };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not issue the key." };
  }
}

export async function adjustApiKeyCredits(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Sign in again." };
  try {
    const result = await api.adjustKeyCredits<{ key: { credits: number } }>(
      String(form.get("keyId") || ""),
      Number(form.get("amount")),
      session.email,
    );
    revalidatePath("/accounts");
    revalidatePath("/keys");
    return { message: `Now ${result.key.credits.toLocaleString("en-US")} try-ons left.` };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not change the try-ons." };
  }
}

export async function revokeApiKey(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Sign in again." };
  try {
    await api.revokeKey(String(form.get("keyId") || ""), session.email);
    revalidatePath("/accounts");
    revalidatePath("/keys");
    return { message: "Key revoked." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not revoke the key." };
  }
}

export async function grantAccountCredits(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Sign in again." };
  try {
    const result = await api.grantAccountCredits<{ account: { credits: number } }>({
      accountId: String(form.get("accountId") || ""), amount: Number(form.get("amount")),
      reference: String(form.get("reference") || ""), note: String(form.get("note") || ""),
    }, session.email);
    revalidatePath("/accounts");
    return { message: `Credits added. New balance: ${result.account.credits}.` };
  } catch (error) { return { error: error instanceof ApiError ? error.message : "Could not grant credits." }; }
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  const ip = clientIp(await headers());

  if (tooManyAttempts(ip, email)) return { error: "Too many attempts. Wait a few minutes." };

  beginAttempt(ip, email);
  const who = await authenticate(email, password);
  if (!who) return { error: "That email and password do not match." };
  attemptSucceeded(ip, email);

  await startSession(who);
  console.log(`[admin] ${who} signed in from ${ip}`);
  redirect("/");
}

/**
 * The address the login throttle is keyed on.
 *
 * Deployment assumption (README: Render or Vercel, no config in this repo):
 * - On Vercel (VERCEL=1) the platform overwrites `x-real-ip`, so that is used.
 * - Elsewhere, `cf-connecting-ip` (set by Cloudflare, which fronts Render) and
 *   then `x-real-ip` are preferred, falling back to the RIGHT-most
 *   X-Forwarded-For entry — the one appended by the nearest proxy. The left-most
 *   entry is whatever the client sent and must never be trusted.
 * - On AWS the other headers are ignored, because a caller can forge them, and
 *   CLIENT_IP_HEADER names the trustworthy source: "x-forwarded-for-last" (the
 *   ECS load balancer appends the connecting address as the right-most entry)
 *   or "cloudfront-viewer-address" (set by CloudFront as "ip:port").
 * If the host is reachable without a proxy that sets these, they can be forged;
 * the per-account and global limits in lib/auth.ts still bound guessing then.
 */
function clientIp(head: Headers) {
  const pick = (name: string) => (head.get(name) || "").trim();
  const mode = (process.env.CLIENT_IP_HEADER || "").toLowerCase();
  if (mode === "x-forwarded-for-last") {
    const forwarded = pick("x-forwarded-for").split(",").map((part) => part.trim()).filter(Boolean);
    return (forwarded[forwarded.length - 1] || "unknown").slice(0, 64);
  }
  if (mode === "cloudfront-viewer-address") {
    const viewer = pick("cloudfront-viewer-address");
    const ip = viewer.slice(0, viewer.lastIndexOf(":")).replace(/^\[|\]$/g, "");
    return (ip || "unknown").slice(0, 64);
  }
  const forwarded = pick("x-forwarded-for").split(",").map((part) => part.trim()).filter(Boolean);
  const candidates =
    process.env.VERCEL === "1"
      ? [pick("x-real-ip"), forwarded[0]]
      : [pick("cf-connecting-ip"), pick("x-real-ip"), forwarded[forwarded.length - 1]];
  return (candidates.find(Boolean) || "unknown").slice(0, 64);
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

/**
 * Runs one action against one store.
 *
 * The shop and action come from the form rather than from a closure, so a
 * single server action serves every button on the page — and every one of them
 * is still checked against the session before anything happens.
 */
export async function storeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Reload and sign in again." };

  const shop = String(form.get("shop") || "");
  const action = String(form.get("action") || "");
  if (!shop || !action) return { error: "Missing store or action." };

  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key !== "shop" && key !== "action" && key !== "actor") payload[key] = value;
  }

  try {
    const result = await api.act<{ message: string }>(shop, action, payload, session.email);
    revalidatePath("/", "layout");
    return { message: result.message };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "That did not work." };
  }
}

export async function renameApiKey(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Sign in again." };
  try {
    await api.renameKey(String(form.get("keyId") || ""), String(form.get("name") || ""), String(form.get("note") || ""), session.email);
    revalidatePath("/keys");
    revalidatePath("/accounts");
    return { message: "Saved." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Could not save." };
  }
}
