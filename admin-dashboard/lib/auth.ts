// Who may use the dashboard, and how a session is proven.
//
// Accounts live in the ADMIN_USERS environment variable rather than a database:
// there are a handful of them, they change rarely, and keeping them out of the
// product's own tables means a compromise of the app cannot mint an admin.
//
//   Format (comma-separated):  email:scrypt$<salt>$<hash>
//   Generate an entry with:    npm run hash -- you@example.com 'a long passphrase'

import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

// The session is a stateless signed token, so signing out cannot revoke a copy
// someone else already holds — keeping the lifetime to a working day bounds that.
const SESSION_HOURS = 8;

// `__Host-` makes the browser refuse the cookie unless it is Secure, has
// Path=/ and no Domain, so a sibling subdomain cannot plant or overwrite it.
// Plain name in development, where the site is served over http.
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE = IS_PRODUCTION ? "__Host-admin_session" : "admin_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: IS_PRODUCTION,
  path: "/",
} as const;

export interface Session {
  email: string;
  expires: number;
}

/** Constant-time string comparison that does not leak either length. */
function equal(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

// Async so a password check runs on the libuv pool instead of blocking every
// other request for the ~50 ms scrypt takes.
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "base64url");
    const actual = await scryptAsync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Checked against when the address is unknown, so that path costs exactly one
// scrypt — the same as a known address with a wrong password.
const DUMMY_STORED = `scrypt$${randomBytes(16).toString("base64url")}$${randomBytes(64).toString("base64url")}`;

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
export async function authenticate(email: string, password: string) {
  const wanted = email.trim().toLowerCase();
  const found = accounts().find((account) => account.email === wanted);
  const ok = await verifyPassword(password, found ? found.stored : DUMMY_STORED);
  return ok && found ? found.email : null;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

const sign = (value: string) =>
  createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url");

export async function startSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + SESSION_HOURS * 3600_000 })).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, { ...COOKIE_OPTIONS, maxAge: SESSION_HOURS * 3600 });
}

export async function endSession() {
  const store = await cookies();
  // Overwritten with the same attributes rather than store.delete(): a bare
  // deletion is not Secure, and browsers ignore it for a `__Host-` cookie.
  store.set(COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
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
//
// Three fixed-window buckets, all checked before any scrypt runs:
//   ip:email  — guessing one account from one address
//   ip        — spraying many accounts from one address
//   global    — a distributed attack (or a spoofed IP header); trips a short
//               lock on every login rather than letting guesses through
// An attempt is counted as a failure *before* the password is checked, so a
// burst of concurrent requests cannot all slip past the check; a success then
// takes its own count back.

const WINDOW_MS = 15 * 60_000;
const LIMIT_PER_ACCOUNT = 5;
const LIMIT_PER_IP = 20;
const LIMIT_GLOBAL = 100;
const GLOBAL_LOCK_MS = 5 * 60_000;
const MAX_TRACKED = 5_000;

interface Bucket {
  first: number;
  count: number;
}

const buckets = new Map<string, Bucket>();
const allLogins: Bucket & { lockedUntil: number } = { first: 0, count: 0, lockedUntil: 0 };

function live(entry: Bucket | undefined, now: number) {
  return entry && now - entry.first <= WINDOW_MS ? entry : undefined;
}

/** Drops expired windows, then the oldest ones if the map is still too big. */
function evict(now: number) {
  // Entries are (re)inserted when their window starts, so the Map's insertion
  // order is oldest-window-first: expired ones sit at the front.
  for (const [key, entry] of buckets) {
    if (buckets.size > MAX_TRACKED || now - entry.first > WINDOW_MS) buckets.delete(key);
    else break;
  }
}

function bump(key: string, now: number) {
  const entry = live(buckets.get(key), now);
  if (entry) {
    entry.count++;
    return;
  }
  buckets.delete(key);
  buckets.set(key, { first: now, count: 1 });
}

function keys(ip: string, email: string) {
  return { account: `a:${ip}:${email.trim().toLowerCase()}`, ip: `i:${ip}` };
}

export function tooManyAttempts(ip: string, email: string) {
  const now = Date.now();
  if (allLogins.lockedUntil > now) return true;
  const k = keys(ip, email);
  return (
    (live(buckets.get(k.account), now)?.count ?? 0) >= LIMIT_PER_ACCOUNT ||
    (live(buckets.get(k.ip), now)?.count ?? 0) >= LIMIT_PER_IP
  );
}

/** Call before checking the password; counts the attempt as a failure. */
export function beginAttempt(ip: string, email: string) {
  const now = Date.now();
  const k = keys(ip, email);
  bump(k.account, now);
  bump(k.ip, now);
  evict(now);

  if (now - allLogins.first > WINDOW_MS) {
    allLogins.first = now;
    allLogins.count = 0;
  }
  if (++allLogins.count >= LIMIT_GLOBAL) {
    allLogins.lockedUntil = now + GLOBAL_LOCK_MS;
    allLogins.first = now;
    allLogins.count = 0;
    console.warn("[admin] login failures hit the global limit; all logins locked for 5 minutes");
  }
}

/** Call after a successful password check to take the attempt back. */
export function attemptSucceeded(ip: string, email: string) {
  const now = Date.now();
  const k = keys(ip, email);
  buckets.delete(k.account);
  const perIp = live(buckets.get(k.ip), now);
  if (perIp && perIp.count > 0) perIp.count--;
  if (allLogins.count > 0) allLogins.count--;
}
