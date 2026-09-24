// Who may use the dashboard, and how a session is proven.
//
// Accounts live in the ADMIN_USERS environment variable rather than a database:
// there are a handful of them, they change rarely, and keeping them out of the
// product's own tables means a compromise of the app cannot mint an admin.
//
//   Format (comma-separated):  email:scrypt$<salt>$<hash>
//   Generate an entry with:    npm run hash -- you@example.com 'a long passphrase'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const SESSION_HOURS = 12;

export interface Session {
  email: string;
  expires: number;
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("base64url")}`;
}

function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    return equal(scryptSync(password, salt, 64).toString("base64url"), hash);
  } catch {
    return false;
  }
}

function accounts() {
  return (process.env.ADMIN_USERS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(":");
      return { email: entry.slice(0, at).toLowerCase(), stored: entry.slice(at + 1) };
    })
    .filter((account) => account.email && account.stored);
}

export function configured() {
  return accounts().length > 0 && (process.env.ADMIN_SESSION_SECRET || "").length >= 24;
}

/**
 * Checks an email and password.
 *
 * An unknown address still costs one scrypt, so a wrong email and a wrong
 * password take the same time and the form cannot be used to enumerate who has
 * an account.
 */
export function authenticate(email: string, password: string) {
  const wanted = email.trim().toLowerCase();
  const found = accounts().find((account) => account.email === wanted);
  const stored = found ? found.stored : hashPassword(randomBytes(12).toString("hex"));
  return verifyPassword(password, stored) && found ? found.email : null;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

const sign = (value: string) =>
  createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url");

export async function startSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + SESSION_HOURS * 3600_000 })).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  if (!equal(token.slice(dot + 1), sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.e || !data.x || data.x < Date.now()) return null;
    // Only an address still listed in ADMIN_USERS stays valid, so removing
    // someone from the environment logs them out on their next request.
    if (!accounts().some((account) => account.email === data.e)) return null;
    return { email: data.e as string, expires: data.x as number };
  } catch {
    return null;
  }
}

// ─── Login throttling ──────────────────────────────────────────────────────
// In memory on purpose: one small process, and a restart clearing the counters
// is not meaningful next to the scrypt cost of every attempt.

const attempts = new Map<string, { first: number; count: number }>();

export function tooManyAttempts(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > 15 * 60_000) return false;
  return entry.count >= 8;
}

export function recordAttempt(key: string, ok: boolean) {
  if (ok) {
    attempts.delete(key);
    return;
  }
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > 15 * 60_000) attempts.set(key, { first: Date.now(), count: 1 });
  else entry.count++;
  if (attempts.size > 500) attempts.clear();
}
