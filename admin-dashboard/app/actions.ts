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
 * If the host is reachable without a proxy that sets these, they can be forged;
 * the per-account and global limits in lib/auth.ts still bound guessing then.
 */
function clientIp(head: Headers) {
  const pick = (name: string) => (head.get(name) || "").trim();
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
