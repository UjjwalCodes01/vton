export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ClothsyOptions {
  /** Secret API key (`clothsy_live_...`). Defaults to the `CLOTHSY_API_KEY` environment variable. */
  apiKey?: string;
  /** Defaults to `https://fabricvton-api.onrender.com/api/v1`. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 60 000. `tryons.run` always allows at least 90 000. */
  timeoutMs?: number;
  /** Retries for network errors, timeouts and 429/500/502/503 responses. Default 2. */
  maxRetries?: number;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /**
   * Allow constructing the client in a browser. Don't: anyone who opens your site
   * could read the key and spend your credits.
   */
  dangerouslyAllowBrowser?: boolean;
  /** @internal Base retry delay in ms (default 1000, doubled per attempt). For tests. */
  retryDelayMs?: number;
}

export type ImageSource = { url: string } | { imageId: string };

export interface UploadedImage {
  /** Image id (`img_...`), usable by the same account for 24 hours. */
  id: string;
  /** ISO timestamp after which the id stops working. */
  expiresAt: string;
}

export interface UploadOptions {
  filename?: string;
  contentType?: "image/jpeg" | "image/png";
}

export interface CreateTryOnParams {
  /** The shopper photo: a public HTTPS URL or an id from `images.upload`. */
  person: ImageSource;
  /** The garment photo: a public HTTPS URL or an id from `images.upload`. */
  garment: ImageSource;
  /** Optional label, up to 120 characters. */
  title?: string;
  /** Must be `true`: the person in the photo agreed to it being processed. */
  consent: true;
  /** 8–128 chars `[A-Za-z0-9_-]`. Auto-generated when omitted and reused across retries. */
  idempotencyKey?: string;
}

export interface CreatedTryOn {
  id: string;
  status: "pending";
  pollUrl: string;
}

export type TryOnStatus = "pending" | "success" | "failed";

export interface TryOn {
  id: string;
  status: TryOnStatus;
  /** Public image URL, valid for 24 hours, once `status` is `success`. */
  resultUrl: string | null;
  message?: string;
}

export type CompletedTryOn = TryOn & { status: "success"; resultUrl: string };

export interface WaitOptions {
  /** Give up after this many ms. Default 180 000. */
  timeoutMs?: number;
  /** Poll interval in ms. Default 2 500. */
  intervalMs?: number;
  signal?: AbortSignal;
  /** Called with every status seen while waiting. */
  onStatus?: (tryOn: TryOn) => void;
}
