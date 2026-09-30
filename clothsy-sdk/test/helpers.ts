import type { FetchLike } from "../src/index.js";

export interface RecordedCall {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

export type Responder = (call: RecordedCall, init: RequestInit) => Response | Promise<Response>;

/** A fetch mock that answers with the queued responders, in order. */
export function mockFetch(...responders: Responder[]): FetchLike & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fn = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const call: RecordedCall = {
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: init.body,
    };
    calls.push(call);
    const responder = responders[calls.length - 1];
    if (!responder) throw new Error(`Unexpected request #${calls.length}: ${call.method} ${call.url}`);
    return responder(call, init);
  }) as FetchLike & { calls: RecordedCall[] };
  fn.calls = calls;
  return fn;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Responder {
  return () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

export function apiError(status: number, code: string, headers: Record<string, string> = {}): Responder {
  return json({ error: `error ${code}`, code }, status, headers);
}

export function networkError(): Responder {
  return () => {
    throw new TypeError("fetch failed");
  };
}

/** Never answers until aborted. */
export function hang(): Responder {
  return (_call, init) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
}

export const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

export const KEY = "clothsy_live_test_key";
