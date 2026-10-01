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
function requireAdultBand(face: Face, second: SecondEstimate | null): AgeBand {
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

// ── Observations → decisions ───────────────────────────────────────────────
// The checks below decide from Rekognition's observations (and MiVOLO's
// estimate), however they were gathered: one call per Rekognition action
// ("legacy"), or all of them for one image in one call to the clothsy-guard
// Lambda ("guard"). The order and messages are the ones this file has always
// used: moderation first, then the face, people, public figures, then age.

type PersonObservations = {
  faces: Face[];
  labels: ObjectLabel[];
  moderation: Label[];
  celebrities: { MatchConfidence?: number }[];
};
type GarmentObservations = { labels: ObjectLabel[]; moderation: Label[] };
type OutputObservations = { faces: Face[]; labels: ObjectLabel[]; moderation: Label[] };
type SecondSource = (face: Face, person: Box | undefined) => Promise<SecondEstimate | null>;

function blockUnsafe(labels: Label[], output = false, garment = false) {
  if (unsafe(labels, output, garment)) {
    throw new SafetyBlockError("safety_content", "This image cannot be used for a try-on.");
  }
}

async function decidePerson(obs: PersonObservations, second: SecondSource): Promise<AgeBand> {
  blockUnsafe(obs.moderation);
  const face = singleFace(obs.faces);
  const people = obs.labels.find((label) => label.Name === "Person")?.Instances || [];
  if (people.filter((person) => (person.Confidence ?? 0) >= 70).length > 1) {
    throw new SafetyBlockError("safety_multiple_people", "Please use a photo with only one person.");
  }
  if (obs.celebrities.some((celebrity) => (celebrity.MatchConfidence ?? 0) >= 90)) {
    throw new SafetyBlockError("safety_public_figure", "This photo cannot be used for a try-on.");
  }
  // A minor reading from Rekognition alone needs no second opinion.
  const estimate = ageBand(face.AgeRange, null) === "minor" ? null : await second(face, personBox(obs.labels));
  return requireAdultBand(face, estimate);
}

function decideGarment(obs: GarmentObservations) {
  blockUnsafe(obs.moderation, false, true);
  if (obs.labels.some((label) => (label.Confidence ?? 0) >= 75 && BLOCKED_GARMENT.test(label.Name || ""))) {
    throw new SafetyBlockError("safety_garment", "This garment is not available for virtual try-on.");
  }
}

async function decideOutput(obs: OutputObservations, second: SecondSource): Promise<AgeBand> {
  blockUnsafe(obs.moderation, true);
  const face = singleFace(obs.faces);
  const estimate = ageBand(face.AgeRange, null) === "minor" ? null : await second(face, personBox(obs.labels));
  return requireAdultBand(face, estimate);
}

// ── Legacy: one /v1/screen call per Rekognition action, then /v1/age ───────

async function legacyModeration(bytes: Uint8Array, output: boolean) {
  const result = await rekognition<{ ModerationLabels?: Label[] }>("DetectModerationLabels", bytes, { MinConfidence: output ? 30 : 50 });
  return result.ModerationLabels || [];
}

const legacySecond = (bytes: Uint8Array): SecondSource => (face, person) => secondEstimate(bytes, face, person);

async function legacyPerson(bytes: Uint8Array): Promise<AgeBand> {
  const [faceResult, celebrityResult, moderationLabels, objectResult] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", bytes, { Attributes: ["AGE_RANGE"] }),
    rekognition<{ CelebrityFaces?: { MatchConfidence?: number }[] }>("RecognizeCelebrities", bytes),
    legacyModeration(bytes, false),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", bytes, { MaxLabels: 40, MinConfidence: 60 }),
  ]);
  return decidePerson({
    faces: faceResult.FaceDetails || [],
    labels: objectResult.Labels || [],
    moderation: moderationLabels,
    celebrities: celebrityResult.CelebrityFaces || [],
  }, legacySecond(bytes));
}

async function legacyGarment(bytes: Uint8Array) {
  const [moderationLabels, objects] = await Promise.all([
    legacyModeration(bytes, false),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", bytes, { MaxLabels: 50, MinConfidence: 65 }),
  ]);
  decideGarment({ labels: objects.Labels || [], moderation: moderationLabels });
}

async function legacyOutput(bytes: Uint8Array): Promise<AgeBand> {
  const [faces, moderationLabels, objects] = await Promise.all([
    rekognition<{ FaceDetails?: Face[] }>("DetectFaces", bytes, { Attributes: ["AGE_RANGE"] }),
    legacyModeration(bytes, true),
    rekognition<{ Labels?: ObjectLabel[] }>("DetectLabels", bytes, { MaxLabels: 40, MinConfidence: 60 }),
  ]);
  return decideOutput({ faces: faces.FaceDetails || [], labels: objects.Labels || [], moderation: moderationLabels }, legacySecond(bytes));
}

// ── Guard: every observation for one image in one call (POST /v1/guard/*) ──
// SAFETY_GUARD_MODE: "legacy" (default), "shadow" (legacy decides; the guard
// runs alongside and only differences are logged, as decision codes), "guard".

type GuardMode = "legacy" | "shadow" | "guard";
type GuardResponse = {
  faces?: Face[];
  labels?: ObjectLabel[];
  moderation?: Label[];
  celebrities?: { MatchConfidence?: number }[];
  age?: SecondEstimate | null;
  sha256?: string;
};

export function guardMode(): GuardMode {
  const mode = process.env.SAFETY_GUARD_MODE;
  return mode === "guard" || mode === "shadow" ? mode : "legacy";
}

// Timeouts allow for a cold guard container (it loads MiVOLO on first use)
// until provisioned concurrency is on; the guard's own budget is about 4 s.
const GUARD_TIMEOUT_MS = { person: 15_000, garment: 10_000, output: 20_000 } as const;

async function guard(route: keyof typeof GUARD_TIMEOUT_MS, body: Uint8Array | { url: string }): Promise<GuardResponse> {
  const api = safetyApi();
  if (!api) throw new SafetyUnavailableError();
  const raw = body instanceof Uint8Array;
  const contentType = !raw ? "application/json" : body[0] === 0x89 ? "image/png" : "image/jpeg";
  try {
    const response = await fetch(`${api.base}/v1/guard/${route}`, {
      method: "POST",
      headers: { ...api.headers, "content-type": contentType },
      body: raw ? Buffer.from(body) : JSON.stringify(body),
      signal: AbortSignal.timeout(GUARD_TIMEOUT_MS[route]),
    });
    if (!response.ok) throw new SafetyUnavailableError();
    return await response.json() as GuardResponse;
  } catch {
    throw new SafetyUnavailableError();
  }
}

/** The guard's MiVOLO estimate. null (no clear single face, or it failed) applies the strict rule, as legacy does. */
const guardSecond = (result: GuardResponse): SecondSource => async () => {
  const estimate = result.age;
  return estimate && typeof estimate.age === "number" && Number.isFinite(estimate.age) && typeof estimate.faceSize === "number"
    ? { age: estimate.age, faceSize: estimate.faceSize }
    : null;
};

async function guardPerson(bytes: Uint8Array): Promise<AgeBand> {
  const result = await guard("person", bytes);
  return decidePerson({
    faces: result.faces || [],
    labels: result.labels || [],
    moderation: result.moderation || [],
    celebrities: result.celebrities || [],
  }, guardSecond(result));
}

async function guardGarment(bytes: Uint8Array) {
  const result = await guard("garment", bytes);
  decideGarment({ labels: result.labels || [], moderation: result.moderation || [] });
}

async function guardOutput(body: Uint8Array | { url: string }): Promise<{ band: AgeBand; sha256?: string }> {
  const result = await guard("output", body);
  const band = await decideOutput(
    { faces: result.faces || [], labels: result.labels || [], moderation: result.moderation || [] },
    guardSecond(result),
  );
  return { band, sha256: result.sha256 };
}

function outcome(error: unknown): string {
  if (error instanceof SafetyBlockError) return error.code;
  if (error instanceof SafetyUnavailableError) return "unavailable";
  return "error";
}

/** Runs the legacy decision; in shadow mode also the guard's, logging only when the outcomes differ. */
async function withShadow<T>(surface: string, legacy: () => Promise<T>, viaGuard: () => Promise<unknown>): Promise<T> {
  const mode = guardMode();
  if (mode === "guard") return viaGuard() as Promise<T>;
  if (mode === "legacy") return legacy();
  const shadow = viaGuard().then(() => "allow", outcome);
  try {
    const value = await legacy();
    void shadow.then((got) => { if (got !== "allow") console.warn(`[guard-shadow] ${surface}: legacy=allow guard=${got}`); });
    return value;
  } catch (error) {
    const expected = outcome(error);
    void shadow.then((got) => { if (got !== expected) console.warn(`[guard-shadow] ${surface}: legacy=${expected} guard=${got}`); });
    throw error;
  }
}

export function checkGarmentTitle(title: string | null, category: string | null) {
  if (BLOCKED_GARMENT.test(`${title || ""} ${category || ""}`)) {
    throw new SafetyBlockError("safety_garment", "This garment is not available for virtual try-on.");
  }
}

export async function screenPersonImage(blob: Blob): Promise<AgeBand> {
  const bytes = checkBytes(new Uint8Array(await blob.arrayBuffer()));
  return withShadow("person", () => legacyPerson(bytes), () => guardPerson(bytes));
}

export async function screenGarmentImage(bytes: Uint8Array) {
  const checked = checkBytes(bytes);
  await withShadow("garment", () => legacyGarment(checked), () => guardGarment(checked));
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

// Approved outputs, per process, for 30 minutes. In guard mode they are keyed by
// the SHA-256 of the bytes as downloaded (what the guard reports), so a result
// approved during a status poll is not screened again when /i/ serves it.
function rememberApproval(key: string) {
  if (approvedResults.size >= 500) approvedResults.clear();
  approvedResults.set(key, Date.now() + 30 * 60_000);
}
const approved = (key: string) => (approvedResults.get(key) || 0) > Date.now();
const approvalKey = (bytes: Uint8Array) => `${SAFETY_POLICY_VERSION}:${createHash("sha256").update(bytes).digest("hex")}`;

export async function screenResultImage(bytes: Uint8Array) {
  const checked = checkBytes(bytes);
  // G1 step 4: the model can change a face, so the output gets both estimators too.
  if (guardMode() === "guard") {
    const key = approvalKey(bytes);
    if (approved(key)) return;
    await guardOutput(checked);
    rememberApproval(key);
    return;
  }
  const key = approvalKey(checked);
  if (approved(key)) return;
  await withShadow("output", () => legacyOutput(checked), () => guardOutput(checked));
  rememberApproval(key);
}

export async function fetchScreenedResult(url: string, maxBytes = MAX_CHECK_BYTES) {
  const bytes = await downloadPublicImage(url, maxBytes);
  await screenResultImage(bytes);
  return bytes;
}

/**
 * Screens a provider result without needing its bytes here (status polls). In
 * guard mode the guard downloads it itself, so the image does not travel to
 * this server and back, and results over 4 MB are resized instead of stalling.
 */
export async function screenResultUrl(url: string) {
  if (guardMode() !== "guard") {
    await fetchScreenedResult(url);
    return;
  }
  const { sha256 } = await guardOutput({ url });
  if (sha256) rememberApproval(`${SAFETY_POLICY_VERSION}:${sha256}`);
}
