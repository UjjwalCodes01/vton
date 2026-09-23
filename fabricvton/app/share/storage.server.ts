// S3-compatible object storage for shared try-on looks.
//
// Signed by hand rather than through the AWS SDK: the whole surface is three
// requests (PUT, GET, DELETE) against one bucket, and the SDK would add tens of
// megabytes to an image the backend has to cold-start on Render.
//
// Works against Cloudflare R2 and against AWS S3. R2 is addressed path-style
// (endpoint/bucket/key); S3 prefers virtual-hosted style (bucket.s3.<region>
// .amazonaws.com/key) and has been trying to retire path-style for years. Both
// are supported: if the endpoint's host already starts with the bucket name,
// the bucket is not repeated in the path.

import { createHash, createHmac } from "node:crypto";

const ENDPOINT = (process.env.SHARE_S3_ENDPOINT || "").replace(/\/+$/, "");
const BUCKET = process.env.SHARE_S3_BUCKET || "";
const KEY_ID = process.env.SHARE_S3_KEY_ID || "";
const SECRET = process.env.SHARE_S3_SECRET || "";
// R2 ignores the region but still requires one in the signature, and "auto" is
// what Cloudflare's own docs use. AWS does NOT ignore it: a bucket in
// ap-south-1 signed as "auto" is rejected outright, so S3 users must set this.
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

/**
 * Where this object lives, in whichever addressing style the endpoint implies.
 *
 * Getting this wrong is quiet rather than loud — a path-style URL against a
 * virtual-hosted endpoint asks for `bucket/bucket/key` and simply 404s — so it
 * is decided from the endpoint itself rather than from a flag someone has to
 * remember to set.
 */
function objectUrl(key: string) {
  const base = new URL(ENDPOINT);
  const virtualHosted = base.hostname.toLowerCase().startsWith(`${BUCKET.toLowerCase()}.`);
  return new URL(virtualHosted ? `${ENDPOINT}/${encodeKey(key)}` : `${ENDPOINT}/${BUCKET}/${encodeKey(key)}`);
}

function signedRequest(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer, contentType?: string) {
  const url = objectUrl(key);
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
