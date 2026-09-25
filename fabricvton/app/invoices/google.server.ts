// Sign in with Google.
//
// The whole exchange happens here, on the backend, and the portal only ever
// receives the same short-lived handoff token a Shopify arrival produces. That
// keeps the client secret in one place and means the portal stays a thing with
// no credentials in it.
//
// No OAuth library: this is one redirect and one POST, and a dependency that
// can read the client secret is a dependency worth not having.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
/** Google's own endpoint for turning an access token into a profile. */
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

/** How long a sign-in attempt may sit half-finished. */
const STATE_TTL_MS = 10 * 60 * 1000;

function secret() {
  return process.env.PORTAL_SIGNING_SECRET || process.env.SHOPIFY_API_SECRET || "";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Where Google returns the browser. Must match the console entry exactly. */
export function redirectUri() {
  const base = (process.env.PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
  return `${base}/auth/google/callback`;
}

/**
 * A signed, expiring `state`.
 *
 * Carries the nonce that proves the callback belongs to a sign-in this server
 * started — the defence against someone feeding a victim's browser an
 * attacker's authorization code.
 */
export function mintState() {
  const payload = Buffer.from(
    JSON.stringify({ n: randomBytes(12).toString("base64url"), x: Date.now() + STATE_TTL_MS, k: "oauth" }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function stateValid(state: string) {
  const dot = String(state || "").lastIndexOf(".");
  if (dot < 1) return false;

  const payload = state.slice(0, dot);
  if (!equal(state.slice(dot + 1), sign(payload))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.k === "oauth" && data.x > Date.now();
  } catch {
    return false;
  }
}

export function authorizeUrl(state: string) {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // Ask every time rather than silently reusing a session, so signing out here
  // is not undone by a Google session the person forgot about.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

/** Trades the one-time code for a profile. Throws if Google refuses. */
export async function profileFromCode(code: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Google refused the code exchange (${tokenResponse.status}).`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) throw new Error("Google returned no access token.");

  const profileResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!profileResponse.ok) throw new Error(`Could not read the Google profile (${profileResponse.status}).`);

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!profile.sub || !profile.email) throw new Error("Google returned an incomplete profile.");
  // An unverified address could belong to anyone, and email is how accounts are
  // matched — accepting one would let somebody claim a store's account.
  if (profile.email_verified === false) throw new Error("That Google address is not verified.");

  return { sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture };
}
