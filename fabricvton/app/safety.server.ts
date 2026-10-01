// Conservative safety checks for the current Perfect Corp workflow. No image
// bytes, signed URLs, or Rekognition responses are written to logs or the DB.
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { get as httpsGet } from "node:https";
import { stripImageMetadata } from "./share/imagemeta.server";

const MAX_CHECK_BYTES = 4 * 1024 * 1024; // Base64 plus API event must fit Lambda's 6 MB invoke limit.
export const SAFETY_CONSENT_VERSION = "2026-09-29.v3";
const SAFETY_POLICY_VERSION = "2026-10-01.1";
const approvedResults = new Map<string, number>();
const BLOCKED_GARMENT = /\b(?:lingerie|under[ -]?wear|underpants|pant(?:y|ies)|bras?|bikinis?|swim[ -]?wear|swimsuits?|sheer|see[ -]?through|transparent|mesh|bodysuits?|thongs?|corsets?|nighties|negligees?)\b/i;

export class SafetyBlockError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export class SafetyUnavailableError extends Error {
  constructor() { super("Safety screening is temporarily unavailable."); }
}

type Label = { Name?: string; ParentName?: string; Confidence?: number };
type Box = { Left?: number; Top?: number; Width?: number; Height?: number };
type ObjectLabel = { Name?: string; Confidence?: number; Instances?: { Confidence?: number; BoundingBox?: Box }[] };
type Face = { Confidence?: number; AgeRange?: { Low?: number; High?: number }; BoundingBox?: Box };
type SecondEstimate = { age: number; faceSize: number };

// Policy G1, minor protection (safety-guardrails.md, section 5). Two age
// estimators: Rekognition DetectFaces (the AgeRange midpoint, with a low value
// under 16 as a hard trigger) and MiVOLO v2 (POST /v1/age on the safety API).
//   minor:     either estimate under 18, or Rekognition's low under 16 -> blocked
//   challenge: both 18 or over, either under 25 -> standard garments only
//   adult:     both 25 or over
//   unknown:   face too small, or the estimates more than 8 years apart -> new photo
// Revealing garments are blocked for everyone (checkGarmentTitle, garment
// moderation), so challenge needs no garment rule here; keep it blocked for
// challenge if that ever changes. Without the second estimator (not deployed,
// or unavailable), one estimate cannot place anyone in the challenge band, so
// the September stopgap applies: Rekognition's low at least 18 and midpoint at
// least 25. An outage can therefore only make the check stricter.
export type AgeBand = "minor" | "challenge" | "adult" | "unknown";
const ADULT_AGE = 18;
const CHALLENGE_AGE = 25;
const HARD_MINOR_LOW = 16;
const MAX_ESTIMATOR_GAP = 8;
const MIN_FACE_PX = 80;

// The safety API runs in AWS with an IAM role. Render only holds its existing
// RPAPIR client credential; no AWS access key is needed in the web process.
function safetyApi() {
  const base = process.env.SAFETY_PROXY_BASE;
  const clientId = process.env.CLOTHES_PROXY_CLIENT_ID;
  const token = process.env.CLOTHES_PROXY_TOKEN;
  if (!base?.startsWith("https://") || !clientId || !token) return null;
  return {
    base: base.replace(/\/$/, ""),
    headers: { "content-type": "application/json", "x-client-id": clientId, "x-client-token": token },
  };
}

async function rekognition<T>(action: string, bytes: Uint8Array, other: object = {}): Promise<T> {
  const api = safetyApi();
  if (!api) throw new SafetyUnavailableError();
  try {
    const response = await fetch(`${api.base}/v1/screen`, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify({ action, image: Buffer.from(bytes).toString("base64"), ...other }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new SafetyUnavailableError();
    return await response.json() as T;
  } catch {
    throw new SafetyUnavailableError();
  }
}

/** MiVOLO v2's age for this face, or null when the age service is absent or failing (the stopgap then applies). */
async function secondEstimate(bytes: Uint8Array, face: Face, person: Box | undefined): Promise<SecondEstimate | null> {
  const api = safetyApi();
  if (!api || !face.BoundingBox) return null;
  try {
    const response = await fetch(`${api.base}/v1/age`, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify({ image: Buffer.from(bytes).toString("base64"), face: face.BoundingBox, person: person ?? null }),
      // A cold age container loads its model on the first request (Lambda
      // timeout 28 s, API Gateway 29 s); a timeout falls back to the strict rule.
      signal: AbortSignal.timeout(27_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { age?: unknown; faceSize?: unknown };
    if (typeof data.age !== "number" || !Number.isFinite(data.age) || typeof data.faceSize !== "number") return null;
    return { age: data.age, faceSize: data.faceSize };
  } catch {
    return null;
  }
}

/** The G1 age band for one face (see the policy note at the top). */
export function ageBand(range: Face["AgeRange"], second: SecondEstimate | null): AgeBand {
  const low = range?.Low;
  const high = range?.High;
  if (low === undefined || high === undefined) return "unknown";
  const first = (low + high) / 2; // AWS: the midpoint is the best single estimate
  if (low < HARD_MINOR_LOW || first < ADULT_AGE) return "minor";
  if (!second) return low >= ADULT_AGE && first >= CHALLENGE_AGE ? "adult" : "unknown";
  if (second.faceSize < MIN_FACE_PX) return "unknown";
  if (second.age < ADULT_AGE) return "minor";
  if (Math.abs(first - second.age) > MAX_ESTIMATOR_GAP) return "unknown";
  return Math.min(first, second.age) < CHALLENGE_AGE ? "challenge" : "adult";
}

function personBox(labels: ObjectLabel[] = []): Box | undefined {
  const people = labels.find((label) => label.Name === "Person")?.Instances || [];
  return [...people].sort((a, b) => (b.Confidence ?? 0) - (a.Confidence ?? 0))[0]?.BoundingBox;
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

function singleFace(faces: Face[]): Face {
  if (faces.length !== 1 || (faces[0].Confidence ?? 0) < 90) {
    throw new SafetyBlockError("safety_single_face", "Please use a clear photo of one adult person.");
  }
  return faces[0];
}

/** Blocks unless the face's G1 band is challenge or adult; returns the band. */
async function checkAge(bytes: Uint8Array, face: Face, person: Box | undefined): Promise<AgeBand> {
  // A minor reading from Rekognition alone needs no second opinion.
  const second = ageBand(face.AgeRange, null) === "minor" ? null : await secondEstimate(bytes, face, person);
  const band = ageBand(face.AgeRange, second);
  if (band === "minor" || (band === "unknown" && !second)) {
    throw new SafetyBlockError("safety_age", "Please use a clear photo of an adult.");
  }
  if (band === "unknown") {
    throw new SafetyBlockError(
      "safety_age",
      "Please use a clear, front-facing photo of one adult person, with the face large enough to see.",
    );
  }
  return band;
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

export async function screenPersonImage(blob: Blob): Promise<AgeBand> {
  const bytes = checkBytes(new Uint8Array(await blob.arrayBuffer()));
  const [faceResult, celebrityResult, , objectResult] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", bytes, { Attributes: ["AGE_RANGE"] }),
    rekognition<{ CelebrityFaces?: { MatchConfidence?: number }[] }>("RecognizeCelebrities", bytes),
    moderation(bytes),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", bytes, { MaxLabels: 40, MinConfidence: 60 }),
  ]);
  const face = singleFace(faceResult.FaceDetails || []);
  const people = (objectResult.Labels || []).find((label) => label.Name === "Person")?.Instances || [];
  if (people.filter((person) => (person.Confidence ?? 0) >= 70).length > 1) {
    throw new SafetyBlockError("safety_multiple_people", "Please use a photo with only one person.");
  }
  if ((celebrityResult.CelebrityFaces || []).some((face) => (face.MatchConfidence ?? 0) >= 90)) {
    throw new SafetyBlockError("safety_public_figure", "This photo cannot be used for a try-on.");
  }
  return checkAge(bytes, face, personBox(objectResult.Labels));
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
  // G1 step 4: the model can change a face, so the output gets both estimators too.
  const [faces, , objects] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", checked, { Attributes: ["AGE_RANGE"] }),
    moderation(checked, true),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", checked, { MaxLabels: 40, MinConfidence: 60 }),
  ]);
  await checkAge(checked, singleFace(faces.FaceDetails || []), personBox(objects.Labels));
  if (approvedResults.size >= 500) approvedResults.clear();
  approvedResults.set(digest, Date.now() + 30 * 60_000);
}

export async function fetchScreenedResult(url: string, maxBytes = MAX_CHECK_BYTES) {
  const bytes = await downloadPublicImage(url, maxBytes);
  await screenResultImage(bytes);
  return bytes;
}
