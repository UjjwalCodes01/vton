import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { secrets } from "./aws.js";

// Read-only Sheets access via a Google service account, signed with node:crypto
// so the Lambda bundle needs no Google SDK.

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TIMEOUT_MS = 10_000;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function parseServiceAccount(json: string): ServiceAccount {
  let sa: Partial<ServiceAccount>;
  try {
    sa = JSON.parse(json);
  } catch {
    throw new Error("Google service account credential is not valid JSON");
  }
  if (typeof sa.client_email !== "string" || typeof sa.private_key !== "string") {
    throw new Error("Google service account credential missing client_email/private_key");
  }
  return sa as ServiceAccount;
}

/** Loads the service account from Secrets Manager, or from a local file for operator use. */
export async function loadServiceAccount(opts: { secretId?: string; file?: string }): Promise<ServiceAccount> {
  if (opts.file) return parseServiceAccount(await readFile(opts.file, "utf8"));
  if (!opts.secretId) {
    throw new Error("Set GOOGLE_SA_SECRET_ID (Secrets Manager) or GOOGLE_SERVICE_ACCOUNT_FILE (local)");
  }
  const out = await secrets.send(new GetSecretValueCommand({ SecretId: opts.secretId }));
  if (!out.SecretString) throw new Error("Google service account secret has no SecretString");
  return parseServiceAccount(out.SecretString);
}

const b64url = (value: string | Buffer): string => Buffer.from(value).toString("base64url");

async function accessToken(sa: ServiceAccount): Promise<string> {
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  if (!tokenUri.startsWith("https://")) throw new Error("token_uri must use HTTPS");

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 600 }));
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Google token exchange failed: HTTP ${response.status}`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Google token exchange returned no access_token");
  return body.access_token;
}

/** Returns the raw cell grid for `range` (e.g. "Keys" or "Keys!A:D"). */
export async function fetchSheetValues(sa: ServiceAccount, sheetId: string, range: string): Promise<string[][]> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(sheetId)) throw new Error("SHEET_ID does not look like a spreadsheet ID");

  const token = await accessToken(sa);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}` +
    "?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE";
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) {
    // 403 usually means the sheet was not shared with the service account email.
    throw new Error(`Google Sheets read failed: HTTP ${response.status}`);
  }
  const body = await response.json() as { values?: unknown[][] };
  return (body.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}
