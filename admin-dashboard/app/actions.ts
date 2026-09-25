"use server";

// Every mutation the dashboard can perform.
//
// These run on the server, read the session from the cookie, and forward to the
// product's admin API with the operator's address attached — so the product's
// own audit log records who did it, not just that "the dashboard" did.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authenticate, endSession, getSession, recordAttempt, startSession, tooManyAttempts } from "@/lib/auth";
import { headers } from "next/headers";

/** Drafting, sending and cancelling credit invoices. */
export async function invoiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Your session expired. Reload and sign in again." };

  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) payload[key] = value;
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

  const head = await headers();
  const ip = (head.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const key = `${ip}:${email.toLowerCase()}`;

  if (tooManyAttempts(key)) return { error: "Too many attempts. Wait a few minutes." };

  const who = authenticate(email, password);
  recordAttempt(key, Boolean(who));
  if (!who) return { error: "That email and password do not match." };

  await startSession(who);
  console.log(`[admin] ${who} signed in from ${ip}`);
  redirect("/");
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
    if (key !== "shop" && key !== "action") payload[key] = value;
  }

  try {
    const result = await api.act<{ message: string }>(shop, action, payload, session.email);
    revalidatePath("/", "layout");
    return { message: result.message };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "That did not work." };
  }
}
