// S3-compatible object storage for shared try-on looks.
//
// Signed by hand rather than through the AWS SDK: the whole surface is three
// requests (PUT, GET, DELETE) against one bucket, and the SDK would add tens of
// megabytes to an image the backend has to cold-start on Render.
//
// Works against Cloudflare R2 and against S3 itself; both speak SigV4 with
// path-style addressing.

import { createHash, createHmac } from "node:crypto";

const ENDPOINT = (process.env.SHARE_S3_ENDPOINT || "").replace(/\/+$/, "");
const BUCKET = process.env.SHARE_S3_BUCKET || "";
const KEY_ID = process.env.SHARE_S3_KEY_ID || "";
const SECRET = process.env.SHARE_S3_SECRET || "";
// R2 ignores the region but still requires one in the signature; "auto" is what
// Cloudflare's own docs use.
const REGION = process.env.SHARE_S3_REGION || "auto";

export function shareStorageConfigured() {
  return Boolean(ENDPOINT && BUCKET && KEY_ID && SECRET);
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();

/** Every path segment is escaped, but the separators between them are not. */
function encodeKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
    .join("/");
}

function signedRequest(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer, contentType?: string) {
  const url = new URL(`${ENDPOINT}/${BUCKET}/${encodeKey(key)}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? "");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");

  const canonicalRequest = [
    method,
    url.pathname,
    "", // no query parameters on any of these calls
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${SECRET}`, dateStamp), REGION), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { url: url.toString(), headers };
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const { url, headers } = signedRequest("PUT", key, body, contentType);
  const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(body) });
  if (!res.ok) {
    throw new Error(`storage PUT ${key} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

export async function getObject(key: string) {
  const { url, headers } = signedRequest("GET", key);
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) return null;
  return res;
}

export async function deleteObject(key: string) {
  const { url, headers } = signedRequest("DELETE", key);
  const res = await fetch(url, { method: "DELETE", headers });
  // 404 means it is already gone, which is the outcome we wanted anyway.
  if (!res.ok && res.status !== 404) {
    throw new Error(`storage DELETE ${key} failed: ${res.status}`);
  }
}
