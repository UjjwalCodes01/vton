// Conservative safety checks for the current Perfect Corp workflow. No image
// bytes, signed URLs, or Rekognition responses are written to logs or the DB.
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { get as httpsGet } from "node:https";
import { stripImageMetadata } from "./share/imagemeta.server";

const MAX_CHECK_BYTES = 4 * 1024 * 1024; // Base64 plus API event must fit Lambda's 6 MB invoke limit.
export const SAFETY_CONSENT_VERSION = "2026-09-29.v3";
const SAFETY_POLICY_VERSION = "2026-09-29.1";
const approvedResults = new Map<string, number>();
const BLOCKED_GARMENT = /\b(?:lingerie|under[ -]?wear|underpants|pant(?:y|ies)|bras?|bikinis?|swim[ -]?wear|swimsuits?|sheer|see[ -]?through|transparent|mesh|bodysuits?|thongs?|corsets?|nighties|negligees?)\b/i;

export class SafetyBlockError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export class SafetyUnavailableError extends Error {
  constructor() { super("Safety screening is temporarily unavailable."); }
}

type Label = { Name?: string; ParentName?: string; Confidence?: number };
type ObjectLabel = { Name?: string; Confidence?: number; Instances?: { Confidence?: number }[] };
type Face = { Confidence?: number; AgeRange?: { Low?: number; High?: number } };

// The safety API runs in AWS with an IAM role. Render only holds its existing
// RPAPIR client credential; no AWS access key is needed in the web process.
async function rekognition<T>(action: string, bytes: Uint8Array, other: object = {}): Promise<T> {
  const base = process.env.SAFETY_PROXY_BASE;
  const clientId = process.env.CLOTHES_PROXY_CLIENT_ID;
  const token = process.env.CLOTHES_PROXY_TOKEN;
  if (!base?.startsWith("https://") || !clientId || !token) throw new SafetyUnavailableError();
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/screen`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-client-id": clientId, "x-client-token": token },
      body: JSON.stringify({ action, image: Buffer.from(bytes).toString("base64"), ...other }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new SafetyUnavailableError();
    return await response.json() as T;
  } catch {
    throw new SafetyUnavailableError();
  }
}

function checkBytes(bytes: Uint8Array) {
  const clean = stripImageMetadata(bytes);
  if (!clean || (clean.type !== "image/jpeg" && clean.type !== "image/png")) {
    throw new SafetyBlockError("safety_image_format", "Please use a JPEG or PNG image.");
  }
  if (clean.bytes.length === 0 || clean.bytes.length > MAX_CHECK_BYTES) {
    throw new SafetyBlockError("safety_image_size", "Please use a photo smaller than 4 MB.");
  }
  return clean.bytes;
}

function unsafe(labels: Label[], output = false, garment = false) {
  const threshold = output ? 35 : 55;
  return labels.some((label) => {
    if ((label.Confidence ?? 0) < threshold) return false;
    const name = label.Name || "";
    const parent = label.ParentName || "";
    if (name === "Explicit" || parent === "Explicit" || name === "Explicit Nudity") return true;
    if (name === "Non-Explicit Nudity of Intimate parts and Kissing") return true;
    if (name === "Non-Explicit Nudity" || parent === "Non-Explicit Nudity") return true;
    if (name === "Obstructed Intimate Parts" || parent === "Obstructed Intimate Parts") return true;
    if (name === "Swimwear or Underwear" || parent === "Swimwear or Underwear") return true;
    if (garment && /Swimwear or Underwear/.test(name)) return true;
    return false;
  });
}

function checkFace(faces: Face[]) {
  if (faces.length !== 1 || (faces[0].Confidence ?? 0) < 90) {
    throw new SafetyBlockError("safety_single_face", "Please use a clear photo of one adult person.");
  }
  const low = faces[0].AgeRange?.Low;
  const high = faces[0].AgeRange?.High;
  // One estimator cannot establish adulthood. Use the document's challenge age
  // conservatively and require both the lower bound and midpoint to be adult.
  if (low === undefined || high === undefined || low < 18 || (low + high) / 2 < 25) {
    throw new SafetyBlockError("safety_age", "Please use a clear photo of an adult.");
  }
}

async function moderation(bytes: Uint8Array, output = false, garment = false) {
  const result = await rekognition<{ ModerationLabels?: Label[] }>("DetectModerationLabels", bytes, { MinConfidence: output ? 30 : 50 });
  if (unsafe(result.ModerationLabels || [], output, garment)) {
    throw new SafetyBlockError("safety_content", "This image cannot be used for a try-on.");
  }
}

export function checkGarmentTitle(title: string | null, category: string | null) {
  if (BLOCKED_GARMENT.test(`${title || ""} ${category || ""}`)) {
    throw new SafetyBlockError("safety_garment", "This garment is not available for virtual try-on.");
  }
}

export async function screenPersonImage(blob: Blob) {
  const bytes = checkBytes(new Uint8Array(await blob.arrayBuffer()));
  const [faceResult, celebrityResult, , objectResult] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", bytes, { Attributes: ["AGE_RANGE"] }),
    rekognition<{ CelebrityFaces?: { MatchConfidence?: number }[] }>("RecognizeCelebrities", bytes),
    moderation(bytes),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", bytes, { MaxLabels: 40, MinConfidence: 60 }),
  ]);
  checkFace(faceResult.FaceDetails || []);
  const people = (objectResult.Labels || []).find((label) => label.Name === "Person")?.Instances || [];
  if (people.filter((person) => (person.Confidence ?? 0) >= 70).length > 1) {
    throw new SafetyBlockError("safety_multiple_people", "Please use a photo with only one person.");
  }
  if ((celebrityResult.CelebrityFaces || []).some((face) => (face.MatchConfidence ?? 0) >= 90)) {
    throw new SafetyBlockError("safety_public_figure", "This photo cannot be used for a try-on.");
  }
}

export async function screenGarmentImage(bytes: Uint8Array) {
  const checked = checkBytes(bytes);
  const [, objects] = await Promise.all([
    moderation(checked, false, true),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", checked, { MaxLabels: 50, MinConfidence: 65 }),
  ]);
  if ((objects.Labels || []).some((label) => (label.Confidence ?? 0) >= 75 && BLOCKED_GARMENT.test(label.Name || ""))) {
    throw new SafetyBlockError("safety_garment", "This garment is not available for virtual try-on.");
  }
}

function publicIpv4(address: string) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = p;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

/** Download a signed provider URL or product image without redirects or private-network access. */
export async function downloadPublicImage(value: string, maxBytes: number) {
  let url: URL;
  try { url = new URL(value); } catch { throw new SafetyBlockError("safety_garment_url", "This garment image cannot be checked."); }
  if (url.protocol !== "https:" || url.port || url.username || url.password || value.length > 2048) {
    throw new SafetyBlockError("safety_garment_url", "This garment image cannot be checked.");
  }
  let addresses;
  try { addresses = await lookup(url.hostname, { family: 4, all: true }); } catch { throw new SafetyUnavailableError(); }
  if (!addresses.length || addresses.some(({ address }) => !publicIpv4(address))) {
    throw new SafetyBlockError("safety_garment_url", "This garment image cannot be checked.");
  }
  const pinned = addresses[0].address;
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const request = httpsGet(url, {
      timeout: 12_000,
      // Node can request either one address or an array (autoSelectFamily).
      // Returning a string for an `all: true` lookup makes Node read
      // `addresses[0].address` as undefined and abort every try-on.
      lookup: (_host, options, callback) => {
        if (options.all) {
          (callback as unknown as (error: null, addresses: { address: string; family: 4 }[]) => void)(
            null, [{ address: pinned, family: 4 }],
          );
        } else {
          callback(null, pinned, 4);
        }
      },
      headers: { accept: "image/jpeg,image/png" },
    }, (response) => {
      if (response.statusCode !== 200 || Number(response.headers["content-length"] || 0) > maxBytes) {
        response.destroy(); reject(new SafetyUnavailableError()); return;
      }
      let size = 0;
      const parts: Buffer[] = [];
      response.on("data", (part: Buffer) => {
        size += part.length;
        if (size > maxBytes) { response.destroy(); reject(new SafetyBlockError("safety_image_size", "This image is too large.")); }
        else parts.push(part);
      });
      response.on("end", () => resolve(new Uint8Array(Buffer.concat(parts))));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new SafetyUnavailableError()));
    request.on("error", reject);
  }).catch((error: unknown) => {
    if (error instanceof SafetyBlockError || error instanceof SafetyUnavailableError) throw error;
    throw new SafetyUnavailableError();
  });
  return bytes;
}

export async function screenGarmentUrl(value: string) {
  await screenGarmentImage(await downloadPublicImage(value, MAX_CHECK_BYTES));
}

export async function screenResultImage(bytes: Uint8Array) {
  const checked = checkBytes(bytes);
  const digest = `${SAFETY_POLICY_VERSION}:${createHash("sha256").update(checked).digest("hex")}`;
  if ((approvedResults.get(digest) || 0) > Date.now()) return;
  const [faces] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", checked, { Attributes: ["AGE_RANGE"] }),
    moderation(checked, true),
  ]);
  checkFace(faces.FaceDetails || []);
  if (approvedResults.size >= 500) approvedResults.clear();
  approvedResults.set(digest, Date.now() + 30 * 60_000);
}

export async function fetchScreenedResult(url: string, maxBytes = MAX_CHECK_BYTES) {
  const bytes = await downloadPublicImage(url, maxBytes);
  await screenResultImage(bytes);
  return bytes;
}
