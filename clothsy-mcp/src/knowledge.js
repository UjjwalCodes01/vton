import { readFileSync } from "node:fs";

export const API_BASE_URL = "https://api.clothsyai.fabricvton.com/api/v1";
export const PLATFORM_URL = "https://app.clothsyai.fabricvton.com";
export const DOCS_URL = "https://clothsyai.fabricvton.com/docs/api";
export const SHOPIFY_APP_URL = "https://apps.shopify.com/fabricvton";
export const WOO_PLUGIN_URL = "https://wordpress.org/plugins/clothsy-ai/";

/** `clothsy_live_` + 32 random bytes as base64url. */
export const KEY_PATTERN = /^clothsy_live_[A-Za-z0-9_-]{43}$/;
export const KEY_PREFIX = "clothsy_live_";

export const TOPICS = /** @type {const} */ ([
  "overview",
  "auth",
  "sdk",
  "nextjs",
  "endpoints",
  "errors",
  "limits",
  "images",
  "consent-privacy",
  "ai-label",
]);

/** @type {Record<string, string>} */
export const TOPIC_TITLES = {
  overview: "Overview and choosing an integration",
  auth: "API keys and authentication",
  sdk: "TypeScript SDK (clothsy-ai)",
  nextjs: "Next.js App Router integration",
  endpoints: "HTTP API endpoints",
  errors: "Error codes and retries",
  limits: "Rate limits and credits",
  images: "Image requirements",
  "consent-privacy": "Consent and privacy",
  "ai-label": "AI-generated label",
};

/**
 * @typedef {{
 *   code: string,
 *   status: number,
 *   meaning: string,
 *   cause: string,
 *   fix: string,
 *   retry: "yes" | "no" | "after-fix",
 *   retryNote: string,
 *   sdkClass: string,
 * }} ErrorInfo
 */

/** @type {ErrorInfo[]} */
export const ERRORS = [
  {
    code: "MISSING_IDEMPOTENCY_KEY",
    status: 400,
    meaning: "The request had no valid Idempotency-Key header.",
    cause: "POST /tryons or /tryons/sync was sent without the header, or its value isn't 8-128 characters of A-Za-z0-9_-.",
    fix: "Send `Idempotency-Key: <id>` with 8-128 letters, digits, `_` or `-`. Generate one per shopper action (e.g. crypto.randomUUID()) and reuse it when retrying that same action. The SDK does this for you.",
    retry: "after-fix",
    retryNote: "Retry once the header is fixed.",
    sdkClass: "ValidationError",
  },
  {
    code: "INVALID_IMAGE_URL",
    status: 400,
    meaning: "An image URL was rejected before download.",
    cause: "The URL isn't HTTPS, uses a non-default port, or points at a private/internal address (localhost, 10.x, 192.168.x, etc.).",
    fix: "Use a public HTTPS URL on port 443, e.g. your CDN's product image URL. For local development, upload the file with POST /images and send `personImageId`/`garmentImageId` instead.",
    retry: "after-fix",
    retryNote: "Don't retry the same URL.",
    sdkClass: "ValidationError",
  },
  {
    code: "IMAGE_DOWNLOAD_FAILED",
    status: 400,
    meaning: "An image URL couldn't be downloaded.",
    cause: "The URL didn't answer HTTP 200 with the image within 12 seconds: it redirected, needed a login or cookie, returned HTML, 403/404, was slow, or a signed URL had expired.",
    fix: "Open the URL in a private window: it must return the image bytes directly with no redirect. Use the final CDN URL (not a page URL or a redirecting short link), refresh expired signed URLs, or upload the image with POST /images and send its id instead.",
    retry: "after-fix",
    retryNote: "A retry with the same URL only helps if the failure was a transient slow response.",
    sdkClass: "ValidationError",
  },
  {
    code: "UNSUPPORTED_IMAGE",
    status: 400,
    meaning: "An image isn't JPEG or PNG.",
    cause: "WebP, AVIF, HEIC (iPhone), GIF or a non-image file was sent.",
    fix: "Convert to JPEG before sending. In the browser, draw the photo on a canvas and export `canvas.toBlob(cb, \"image/jpeg\", 0.88)`; TryOnButton/useTryOn already do this. For garments, request a JPEG/PNG variant from your CDN.",
    retry: "after-fix",
    retryNote: "Retry with a JPEG or PNG.",
    sdkClass: "ValidationError",
  },
  {
    code: "INVALID_IMAGE_ID",
    status: 400,
    meaning: "An image id is unknown, expired or belongs to another account.",
    cause: "The `img_...` id is older than 24 hours, was uploaded with a different account's key, or is mistyped.",
    fix: "Upload the image again with POST /images and use the new id straight away. Don't cache image ids for more than 24 hours.",
    retry: "after-fix",
    retryNote: "Re-upload, then retry with the new id.",
    sdkClass: "ValidationError",
  },
  {
    code: "INVALID_API_KEY",
    status: 401,
    meaning: "The API key is missing, malformed or revoked.",
    cause: "No `Authorization: Bearer ...` header, a typo or stray quotes/whitespace in the env var, or the key was revoked (each account has one active key; replacing it means revoking it first, then creating a new one).",
    fix: "Set `CLOTHSY_API_KEY` on the server to the current key from https://app.clothsyai.fabricvton.com -> Developer API, without quotes or spaces, and restart/redeploy. Send `Authorization: Bearer <key>`.",
    retry: "no",
    retryNote: "Retrying with the same key will fail again.",
    sdkClass: "AuthenticationError",
  },
  {
    code: "INSUFFICIENT_CREDITS",
    status: 402,
    meaning: "The account has no credits left.",
    cause: "Every finished try-on uses one credit and the balance reached zero.",
    fix: "Top up the account (email contact@fabricvton.com to buy credits). Meanwhile hide the try-on button and alert your team; don't show this to shoppers. Check the balance with GET /account.",
    retry: "no",
    retryNote: "Retry only after credits are added.",
    sdkClass: "InsufficientCreditsError",
  },
  {
    code: "CONSENT_REQUIRED",
    status: 403,
    meaning: "`consent` wasn't `true`.",
    cause: "The body omitted `consent` or sent `\"true\"`/`1` instead of the JSON boolean `true` (with createTryOnRoute, the `consent` form field wasn't \"true\").",
    fix: "Show a consent checkbox the shopper ticks themselves, and only then send `consent: true` (boolean). Never hard-code consent for photos collected without it.",
    retry: "after-fix",
    retryNote: "Retry once consent was actually collected.",
    sdkClass: "ValidationError",
  },
  {
    code: "NOT_FOUND",
    status: 404,
    meaning: "No try-on with that id exists on this account.",
    cause: "A mistyped or truncated id, an id from another account/key, or a wrong path (e.g. /tryon instead of /tryons).",
    fix: "Use the exact `id` returned by POST /tryons, with the same account's key, at GET /api/v1/tryons/{id}.",
    retry: "no",
    retryNote: "The same request will keep returning 404.",
    sdkClass: "ValidationError",
  },
  {
    code: "METHOD_NOT_ALLOWED",
    status: 405,
    meaning: "The endpoint doesn't accept that HTTP method.",
    cause: "For example GET /tryons or POST /tryons/{id}.",
    fix: "POST /images, POST /tryons, POST /tryons/sync, GET /tryons/{id}, GET /account.",
    retry: "no",
    retryNote: "Fix the method first.",
    sdkClass: "ValidationError",
  },
  {
    code: "IMAGE_TOO_LARGE",
    status: 413,
    meaning: "An image is larger than 4 MB.",
    cause: "A full-resolution phone photo was sent without resizing.",
    fix: "Resize in the browser to about 1600 px on the long side as JPEG quality ~0.88 before upload (TryOnButton/useTryOn already do). Also make sure your own server's body limit allows ~5 MB.",
    retry: "after-fix",
    retryNote: "Retry with the resized image.",
    sdkClass: "ValidationError",
  },
  {
    code: "PERSON_PHOTO_REJECTED",
    status: 422,
    meaning: "The person photo must show exactly one adult, clearly visible.",
    cause: "No person or more than one face was found, the person is too small, blurred, cropped or badly lit, or the person may be under 18. Faces printed on clothing, posters, screens or in mirrors count as extra faces.",
    fix: "Ask the shopper for a clear, well-lit photo of just themselves, facing the camera, with no other people or printed faces (including on their T-shirt) in frame. Shopper-safe wording: \"We couldn't use that photo. Please upload a clear, well-lit photo of just you, facing the camera.\"",
    retry: "after-fix",
    retryNote: "Don't retry the same photo; ask for a different one. No credit was used.",
    sdkClass: "ValidationError",
  },
  {
    code: "IMAGE_REJECTED",
    status: 422,
    meaning: "An image can't be used for a try-on.",
    cause: "The image didn't pass content checks or isn't suitable (e.g. not a photo of a person, or unsafe content).",
    fix: "Ask for a different photo. Shopper-safe wording: \"We couldn't use that photo. Please try a different one.\"",
    retry: "after-fix",
    retryNote: "Don't retry the same image.",
    sdkClass: "ValidationError",
  },
  {
    code: "GARMENT_REJECTED",
    status: 422,
    meaning: "This item isn't available for virtual try-on.",
    cause: "The garment image isn't a wearable item that can be tried on, or it didn't pass content checks.",
    fix: "Hide the try-on button for this product (e.g. return null from resolveProduct), or use a clearer product-only image of the garment.",
    retry: "no",
    retryNote: "Retrying the same garment will fail again.",
    sdkClass: "ValidationError",
  },
  {
    code: "RATE_LIMITED",
    status: 429,
    meaning: "Too many requests.",
    cause: "More than 12 try-on starts a minute (shared by /tryons and /tryons/sync), 60 polls a minute, or 30 uploads a minute on this account.",
    fix: "Wait the number of seconds in the Retry-After header, then retry with the same Idempotency-Key. Poll every 2-3 s, not faster. If you need more than 12 starts a minute at peak, email contact@fabricvton.com.",
    retry: "yes",
    retryNote: "Retry after Retry-After seconds with the same Idempotency-Key.",
    sdkClass: "RateLimitError",
  },
  {
    code: "INTERNAL_ERROR",
    status: 500,
    meaning: "Something went wrong on the Clothsy AI side.",
    cause: "A transient server problem.",
    fix: "Retry with backoff (1 s, 2 s, 4 s) using the same Idempotency-Key. The SDK does this automatically.",
    retry: "yes",
    retryNote: "Retry with the same Idempotency-Key.",
    sdkClass: "ServerError",
  },
  {
    code: "START_FAILED",
    status: 502,
    meaning: "The try-on couldn't be started. No credit was used.",
    cause: "The generation step couldn't be started (a transient upstream problem).",
    fix: "Retry with the same Idempotency-Key after a short backoff.",
    retry: "yes",
    retryNote: "Retry with the same Idempotency-Key; no credit was used.",
    sdkClass: "ServerError",
  },
  {
    code: "UNAVAILABLE",
    status: 503,
    meaning: "Try-on is temporarily unavailable.",
    cause: "Maintenance or temporary overload.",
    fix: "Retry after a short wait with the same Idempotency-Key; show shoppers \"Virtual try-on isn't available right now. Please try again later.\"",
    retry: "yes",
    retryNote: "Retry after a short wait.",
    sdkClass: "ServerError",
  },
];

/** Pseudo-codes that only exist client-side (SDK / network). */
/** @type {ErrorInfo[]} */
export const CLIENT_ERRORS = [
  {
    code: "TRYON_FAILED",
    status: 200,
    meaning: "The try-on finished with `status: \"failed\"` (SDK: TryOnFailedError).",
    cause: "The result couldn't be produced or didn't pass safety checks. `message` explains why.",
    fix: "Show a friendly message and ask for another photo. The credit was refunded automatically.",
    retry: "after-fix",
    retryNote: "Try again with a different photo; repeating the same inputs will usually fail again.",
    sdkClass: "TryOnFailedError",
  },
  {
    code: "TRYON_TIMEOUT",
    status: 0,
    meaning: "The client stopped waiting before the try-on finished (SDK: TryOnTimeoutError).",
    cause: "`waitFor`/`run` hit its `timeoutMs` (default 180 s). The try-on may still finish.",
    fix: "Keep polling GET /tryons/{id} with the id from the error (`tryOnId`), or raise `timeoutMs`. Don't start a new try-on with a new key, or you may be charged twice.",
    retry: "yes",
    retryNote: "Poll the same id again.",
    sdkClass: "TryOnTimeoutError",
  },
  {
    code: "CONNECTION_ERROR",
    status: 0,
    meaning: "No response from the API: network failure or client timeout (SDK: ConnectionError).",
    cause: "DNS/network problems, a firewall, or a client timeout that's too short (/tryons/sync needs at least 70 s).",
    fix: "Retry with the same Idempotency-Key. Check outbound HTTPS to api.clothsyai.fabricvton.com is allowed, and raise timeouts.",
    retry: "yes",
    retryNote: "Retry with the same Idempotency-Key.",
    sdkClass: "ConnectionError",
  },
  {
    code: "INVALID_REQUEST",
    status: 0,
    meaning: "The SDK rejected the arguments before sending anything (SDK: ValidationError).",
    cause: "For example both `url` and `imageId` given, `consent` not true, or an empty id.",
    fix: "Read `err.message` and correct the call: `person` and `garment` each take exactly one of `{ url }` or `{ imageId }`, and `consent` must be `true`.",
    retry: "after-fix",
    retryNote: "Fix the arguments first.",
    sdkClass: "ValidationError",
  },
];

const ALL_ERRORS = [...ERRORS, ...CLIENT_ERRORS];

/** @param {string} code */
export function findError(code) {
  const normalized = code.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ALL_ERRORS.find((e) => e.code === normalized);
}

/** @param {number} status */
export function errorsForStatus(status) {
  return ERRORS.filter((e) => e.status === status);
}

/** Markdown table of every API error code. */
export function errorTable() {
  const rows = ERRORS.map(
    (e) => `| ${e.status} | \`${e.code}\` | ${e.meaning} | ${e.retry === "yes" ? "Yes, same Idempotency-Key" : e.retry === "no" ? "No" : "Only after fixing"} |`,
  );
  return ["| Status | Code | Meaning | Retry? |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * The markdown for one docs topic, read from src/content.
 * @param {string} topic
 */
export function docsFor(topic) {
  if (!TOPICS.includes(/** @type {any} */ (topic))) throw new Error(`Unknown topic: ${topic}`);
  let text = cache.get(topic);
  if (text === undefined) {
    text = readFileSync(new URL(`./content/${topic}.md`, import.meta.url), "utf8");
    if (topic === "errors") text = text.replace("{{ERROR_TABLE}}", errorTable());
    text = `${text.trimEnd()}\n\nFull documentation: ${DOCS_URL}\n`;
    cache.set(topic, text);
  }
  return text;
}

/**
 * Show a key safely: at most its first 13 characters.
 * @param {string} key
 */
export function maskKey(key) {
  return `${key.slice(0, 13)}…`;
}
