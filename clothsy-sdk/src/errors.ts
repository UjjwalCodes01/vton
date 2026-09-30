/** Base class for every error thrown by the Clothsy AI SDK. */
export class ClothsyError extends Error {
  /** HTTP status of the API response, when the error came from one. */
  status?: number;
  /** Machine-readable error code, e.g. `PERSON_PHOTO_REJECTED`. */
  code: string;

  constructor(message: string, options: { code: string; status?: number; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    if (options.status !== undefined) this.status = options.status;
  }
}

/** 401 — the API key is missing, malformed or revoked. */
export class AuthenticationError extends ClothsyError {}

/** 402 — the account has no credits left. */
export class InsufficientCreditsError extends ClothsyError {}

/**
 * The request was rejected (400/403/404/405/413/422), or client-side validation
 * failed before any request was made (code `INVALID_REQUEST`). Check `.code`.
 */
export class ValidationError extends ClothsyError {}

/** 429 — too many requests. `retryAfter` is in seconds, when the API sent one. */
export class RateLimitError extends ClothsyError {
  retryAfter?: number;
  constructor(message: string, options: { code: string; status?: number; retryAfter?: number; cause?: unknown }) {
    super(message, options);
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}

/** 5xx — something went wrong on the Clothsy AI side. */
export class ServerError extends ClothsyError {}

/** The request never got a response: network failure or client timeout. */
export class ConnectionError extends ClothsyError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { code: "CONNECTION_ERROR", cause: options.cause });
  }
}

/** The try-on finished with status `failed`. No credit is charged. */
export class TryOnFailedError extends ClothsyError {
  /** Id of the failed try-on. */
  tryOnId: string;
  constructor(message: string, tryOnId: string) {
    super(message, { code: "TRYON_FAILED" });
    this.tryOnId = tryOnId;
  }
}

/** `waitFor` / `run` gave up before the try-on finished. It may still finish later. */
export class TryOnTimeoutError extends ClothsyError {
  /** Id of the try-on that is still running. */
  tryOnId: string;
  constructor(message: string, tryOnId: string) {
    super(message, { code: "TRYON_TIMEOUT" });
    this.tryOnId = tryOnId;
  }
}

/** Build the right error subclass for an HTTP error response. */
export function errorFromResponse(
  status: number,
  body: { error?: unknown; code?: unknown } | undefined,
  retryAfter?: number,
): ClothsyError {
  const code = typeof body?.code === "string" && body.code ? body.code : codeForStatus(status);
  const message = typeof body?.error === "string" && body.error ? body.error : `Request failed with status ${status}`;
  const opts = { code, status };
  if (status === 401) return new AuthenticationError(message, opts);
  if (status === 402) return new InsufficientCreditsError(message, opts);
  if (status === 429) return new RateLimitError(message, { ...opts, retryAfter });
  if (status >= 500) return new ServerError(message, opts);
  if (status >= 400) return new ValidationError(message, opts);
  return new ClothsyError(message, opts);
}

function codeForStatus(status: number): string {
  switch (status) {
    case 401: return "INVALID_API_KEY";
    case 402: return "INSUFFICIENT_CREDITS";
    case 404: return "NOT_FOUND";
    case 405: return "METHOD_NOT_ALLOWED";
    case 413: return "IMAGE_TOO_LARGE";
    case 429: return "RATE_LIMITED";
    case 502: return "START_FAILED";
    case 503: return "UNAVAILABLE";
    default: return status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
  }
}

const DEFAULT_FRIENDLY = "Virtual try-on isn't available right now. Please try again later.";

const FRIENDLY: Record<string, string> = {
  PERSON_PHOTO_REJECTED:
    "We couldn't use that photo. Please upload a clear, well-lit photo of just you, facing the camera.",
  IMAGE_REJECTED: "We couldn't use that photo. Please try a different one.",
  IMAGE_TOO_LARGE: "Please upload a JPEG or PNG photo under 4 MB.",
  UNSUPPORTED_IMAGE: "Please upload a JPEG or PNG photo under 4 MB.",
  INVALID_IMAGE_ID: "We couldn't read that photo. Please upload it again.",
  IMAGE_DOWNLOAD_FAILED: "We couldn't read that photo. Please upload it again.",
  CONSENT_REQUIRED: "Please confirm you agree to your photo being processed to create the try-on.",
  RATE_LIMITED: "We're busy right now. Please try again in a minute.",
  TRYON_FAILED: "We couldn't create your try-on. Please try another photo.",
  TRYON_TIMEOUT: "This is taking longer than expected. Please try again in a moment.",
};

/**
 * Turn any error into a short message that is safe to show shoppers.
 * Never exposes API keys, internal codes or stack traces.
 */
export function friendlyMessage(error: unknown): string {
  const code = error instanceof ClothsyError ? error.code : undefined;
  return (code && FRIENDLY[code]) || DEFAULT_FRIENDLY;
}
