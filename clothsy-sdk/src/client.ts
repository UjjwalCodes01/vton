import {
  ClothsyError,
  ConnectionError,
  RateLimitError,
  TryOnFailedError,
  TryOnTimeoutError,
  ValidationError,
  errorFromResponse,
} from "./errors.js";
import type {
  ClothsyOptions,
  CompletedTryOn,
  CreateTryOnParams,
  CreatedTryOn,
  FetchLike,
  ImageSource,
  TryOn,
  UploadOptions,
  UploadedImage,
  WaitOptions,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://fabricvton-api.onrender.com/api/v1";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const MAX_RETRY_AFTER_SECONDS = 30;
const SYNC_TIMEOUT_MS = 90_000;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: BodyInit;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface ApiResponse {
  status: number;
  data: any;
}

/**
 * Client for the Clothsy AI virtual try-on API. Server-side only: the API key
 * must never reach a browser.
 *
 * ```ts
 * const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY
 * const result = await clothsy.tryons.run({
 *   person: { url: "https://example.com/me.jpg" },
 *   garment: { url: "https://example.com/shirt.jpg" },
 *   consent: true,
 * });
 * console.log(result.resultUrl);
 * ```
 */
export class Clothsy {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly images: Images;
  readonly tryons: TryOns;
  readonly account: Account;

  #apiKey: string;
  #fetch: FetchLike;
  #retryDelayMs: number;

  constructor(options: ClothsyOptions = {}) {
    if (isBrowser() && !options.dangerouslyAllowBrowser) {
      throw new ClothsyError(
        "The Clothsy AI client can't run in a browser: your secret API key would be visible to anyone " +
          "who opens the page, and they could spend your credits. Call the API from your server instead " +
          "(for Next.js, use `clothsy-ai/next` with the `clothsy-ai/react` component). If you really " +
          "understand the risk, pass `dangerouslyAllowBrowser: true`.",
        { code: "BROWSER_NOT_ALLOWED" },
      );
    }
    const apiKey = options.apiKey ?? readEnv("CLOTHSY_API_KEY");
    if (typeof apiKey !== "string" || apiKey.trim() === "") {
      throw new ClothsyError(
        "Missing Clothsy AI API key. Pass `new Clothsy({ apiKey })` or set the CLOTHSY_API_KEY environment variable.",
        { code: "MISSING_API_KEY" },
      );
    }
    const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (typeof fetchImpl !== "function") {
      throw new ClothsyError("No global fetch found. Use Node 18+ or pass `fetch` in the options.", {
        code: "MISSING_FETCH",
      });
    }
    this.#apiKey = apiKey.trim();
    this.#fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.#retryDelayMs = options.retryDelayMs ?? 1000;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 2));
    this.images = new Images(this);
    this.tryons = new TryOns(this);
    this.account = new Account(this);
  }

  /** @internal Low-level request with timeout and retries. */
  async _request(opts: RequestOptions): Promise<ApiResponse> {
    const url = this.baseUrl + opts.path;
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...opts.headers,
      Authorization: `Bearer ${this.#apiKey}`,
    };

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.maxRetries;
      let res: { status: number; ok: boolean; retryAfter: string | null; text: string };
      try {
        res = await this.#fetchOnce(url, { method: opts.method, headers, body: opts.body }, timeoutMs, opts.signal);
      } catch (err) {
        if (opts.signal?.aborted) throw abortReason(opts.signal);
        const error = err instanceof ConnectionError ? err : new ConnectionError(connectionMessage(err), { cause: err });
        if (!canRetry) throw error;
        await sleep(this.#backoff(attempt), opts.signal);
        continue;
      }

      const data = parseJson(res.text);
      if (res.ok) {
        if (data === undefined) {
          throw new ClothsyError("The API returned an unreadable response.", { code: "INVALID_RESPONSE", status: res.status });
        }
        return { status: res.status, data };
      }

      const retryAfter = parseRetryAfter(res.retryAfter);
      const error = errorFromResponse(res.status, data, retryAfter);
      if (!canRetry || !RETRYABLE_STATUS.has(res.status)) throw error;
      const wait =
        res.status === 429 && retryAfter !== undefined
          ? Math.min(retryAfter, MAX_RETRY_AFTER_SECONDS) * 1000
          : this.#backoff(attempt);
      await sleep(wait, opts.signal);
    }
  }

  #backoff(attempt: number): number {
    return this.#retryDelayMs * 2 ** attempt;
  }

  async #fetchOnce(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    try {
      const response = await this.#fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      return { status: response.status, ok: response.ok, retryAfter: response.headers.get("retry-after"), text };
    } catch (err) {
      if (timedOut) throw new ConnectionError(`Request timed out after ${timeoutMs} ms.`, { cause: err });
      throw err;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}

class Images {
  #client: Clothsy;
  constructor(client: Clothsy) {
    this.#client = client;
  }

  /**
   * Upload a JPEG or PNG photo (max 4 MB). Returns an id usable in
   * `tryons.create` for 24 hours by the same account. Free.
   */
  async upload(data: Blob | ArrayBuffer | Uint8Array, opts: UploadOptions = {}): Promise<UploadedImage> {
    const blob = await toImageBlob(data, opts.contentType);
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const form = new FormData();
    form.append("file", blob, opts.filename || `photo.${ext}`);
    const { data: body } = await this.#client._request({ method: "POST", path: "/images", body: form });
    return { id: String(body.id), expiresAt: String(body.expiresAt) };
  }
}

class TryOns {
  #client: Clothsy;
  constructor(client: Clothsy) {
    this.#client = client;
  }

  /** Start a try-on. Resolves as soon as it is queued (status `pending`). */
  async create(params: CreateTryOnParams, opts: { signal?: AbortSignal } = {}): Promise<CreatedTryOn> {
    const { body, idempotencyKey } = buildTryOnBody(params);
    const { data } = await this.#client._request({
      method: "POST",
      path: "/tryons",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      signal: opts.signal,
    });
    return { id: String(data.id), status: "pending", pollUrl: String(data.pollUrl ?? `/api/v1/tryons/${data.id}`) };
  }

  /** Fetch the current state of a try-on. */
  async retrieve(id: string, opts: { signal?: AbortSignal } = {}): Promise<TryOn> {
    assertId(id);
    const { data } = await this.#client._request({
      method: "GET",
      path: `/tryons/${encodeURIComponent(id)}`,
      signal: opts.signal,
    });
    return toTryOn(data);
  }

  /**
   * Poll until the try-on finishes. Resolves with the result on success;
   * throws `TryOnFailedError` on failure and `TryOnTimeoutError` on timeout.
   */
  async waitFor(id: string, opts: WaitOptions = {}): Promise<CompletedTryOn> {
    assertId(id);
    const timeoutMs = opts.timeoutMs ?? 180_000;
    const intervalMs = Math.max(0, opts.intervalMs ?? 2_500);
    const deadline = Date.now() + timeoutMs;
    const timeout = () =>
      new TryOnTimeoutError(`Try-on ${id} did not finish within ${Math.round(timeoutMs / 1000)} s.`, id);

    for (;;) {
      if (opts.signal?.aborted) throw abortReason(opts.signal);
      let tryOn: TryOn;
      try {
        tryOn = await this.retrieve(id, { signal: opts.signal });
      } catch (err) {
        if (!(err instanceof RateLimitError)) throw err;
        const wait = Math.min(err.retryAfter ?? 5, MAX_RETRY_AFTER_SECONDS) * 1000;
        if (Date.now() + wait > deadline) throw timeout();
        await sleep(wait, opts.signal);
        continue;
      }
      opts.onStatus?.(tryOn);
      const done = settle(tryOn);
      if (done) return done;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw timeout();
      await sleep(Math.min(intervalMs, remaining), opts.signal);
    }
  }

  /**
   * Start a try-on and wait for the result in one call. Uses the server-side
   * wait endpoint first (up to ~55 s), then falls back to polling.
   */
  async run(params: CreateTryOnParams, waitOpts: WaitOptions = {}): Promise<CompletedTryOn> {
    const { body, idempotencyKey } = buildTryOnBody(params);
    const { status, data } = await this.#client._request({
      method: "POST",
      path: "/tryons/sync",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      timeoutMs: Math.max(this.#client.timeoutMs, SYNC_TIMEOUT_MS),
      signal: waitOpts.signal,
    });
    const tryOn = toTryOn(status === 202 ? { ...data, status: "pending" } : data);
    waitOpts.onStatus?.(tryOn);
    return settle(tryOn) ?? this.waitFor(tryOn.id, waitOpts);
  }
}

class Account {
  #client: Clothsy;
  constructor(client: Clothsy) {
    this.#client = client;
  }

  /** Remaining try-on credits. */
  async credits(): Promise<number> {
    const { data } = await this.#client._request({ method: "GET", path: "/account" });
    return Number(data.credits);
  }
}

// ---------------------------------------------------------------------------
// helpers

function settle(tryOn: TryOn): CompletedTryOn | undefined {
  if (tryOn.status === "success" && tryOn.resultUrl) return tryOn as CompletedTryOn;
  if (tryOn.status === "failed") {
    throw new TryOnFailedError(tryOn.message || "The try-on could not be created.", tryOn.id);
  }
  return undefined;
}

function toTryOn(data: any): TryOn {
  const tryOn: TryOn = {
    id: String(data.id),
    status: data.status === "success" || data.status === "failed" ? data.status : "pending",
    resultUrl: typeof data.resultUrl === "string" ? data.resultUrl : null,
  };
  if (typeof data.message === "string") tryOn.message = data.message;
  return tryOn;
}

function invalid(message: string): ValidationError {
  return new ValidationError(message, { code: "INVALID_REQUEST" });
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== "string" || id.trim() === "") throw invalid("A try-on id is required.");
}

function sourceField(name: "person" | "garment", source: ImageSource | undefined): Record<string, string> {
  if (!source || typeof source !== "object") {
    throw invalid(`\`${name}\` is required: pass { url } or { imageId }.`);
  }
  const hasUrl = "url" in source && source.url !== undefined;
  const hasId = "imageId" in source && source.imageId !== undefined;
  if (hasUrl === hasId) throw invalid(`\`${name}\` needs exactly one of \`url\` or \`imageId\`.`);
  if (hasUrl) {
    const url = (source as { url: unknown }).url;
    let parsed: URL | undefined;
    try {
      parsed = typeof url === "string" ? new URL(url) : undefined;
    } catch {
      parsed = undefined;
    }
    if (!parsed || parsed.protocol !== "https:") throw invalid(`\`${name}.url\` must be a public https:// URL.`);
    return { [`${name}ImageUrl`]: url as string };
  }
  const imageId = (source as { imageId: unknown }).imageId;
  if (typeof imageId !== "string" || imageId.trim() === "") {
    throw invalid(`\`${name}.imageId\` must be an id returned by images.upload().`);
  }
  return { [`${name}ImageId`]: imageId };
}

function buildTryOnBody(params: CreateTryOnParams): { body: Record<string, unknown>; idempotencyKey: string } {
  if (!params || typeof params !== "object") throw invalid("Try-on parameters are required.");
  if (params.consent !== true) {
    throw invalid("`consent: true` is required: the person in the photo must agree to it being processed.");
  }
  if (params.title !== undefined && (typeof params.title !== "string" || params.title.length > 120)) {
    throw invalid("`title` must be a string of at most 120 characters.");
  }
  const idempotencyKey = params.idempotencyKey ?? globalThis.crypto.randomUUID();
  if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
    throw invalid("`idempotencyKey` must be 8–128 characters of A-Z, a-z, 0-9, _ or -.");
  }
  const body: Record<string, unknown> = {
    ...sourceField("person", params.person),
    ...sourceField("garment", params.garment),
    consent: true,
  };
  if (params.title !== undefined) body.title = params.title;
  return { body, idempotencyKey };
}

async function toImageBlob(data: Blob | ArrayBuffer | Uint8Array, contentType?: string): Promise<Blob> {
  let blob: Blob;
  if (typeof Blob !== "undefined" && data instanceof Blob) blob = data;
  else if (data instanceof ArrayBuffer || data instanceof Uint8Array) blob = new Blob([data as BlobPart]);
  else throw invalid("images.upload() expects a Blob, File, ArrayBuffer or Uint8Array.");

  if (blob.size === 0) throw invalid("The image is empty.");
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new ValidationError("The image is larger than 4 MB.", { code: "IMAGE_TOO_LARGE" });
  }
  const type = contentType ?? (isImageType(blob.type) ? blob.type : await sniffImageType(blob));
  if (!isImageType(type)) {
    throw new ValidationError("Only JPEG and PNG images are supported.", { code: "UNSUPPORTED_IMAGE" });
  }
  return blob.type === type ? blob : new Blob([blob], { type });
}

function isImageType(type: string | undefined): type is "image/jpeg" | "image/png" {
  return type === "image/jpeg" || type === "image/png";
}

async function sniffImageType(blob: Blob): Promise<string | undefined> {
  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return undefined;
}

function parseJson(text: string): any {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function connectionMessage(err: unknown): string {
  const detail = err instanceof Error && err.message ? `: ${err.message}` : "";
  return `Could not reach the Clothsy AI API${detail}`;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isBrowser(): boolean {
  return typeof (globalThis as any).window !== "undefined" && typeof (globalThis as any).document !== "undefined";
}

function readEnv(name: string): string | undefined {
  const g = globalThis as any;
  try {
    const fromProcess = g.process?.env?.[name];
    if (typeof fromProcess === "string") return fromProcess;
  } catch {
    // ignore
  }
  try {
    const fromDeno = g.Deno?.env?.get?.(name);
    if (typeof fromDeno === "string") return fromDeno;
  } catch {
    // no env permission
  }
  return undefined;
}
