import { randomUUID } from "node:crypto";
import { API_BASE_URL } from "./knowledge.js";

/**
 * @typedef {{ ok: true, status: number, body: any, retryAfter?: number }
 *   | { ok: false, status: number, body: any, code: string, message: string, retryAfter?: number }
 *   | { ok: false, status: 0, body: null, code: "CONNECTION_ERROR" | "TIMEOUT" | "ABORTED", message: string, retryAfter?: undefined }} ApiResponse
 */

/** @param {Record<string, string | undefined>} env */
export function baseUrlFrom(env) {
  const custom = env.CLOTHSY_BASE_URL?.trim();
  return (custom || API_BASE_URL).replace(/\/+$/, "");
}

/**
 * One request to the Clothsy API with a hard timeout. Never throws for HTTP or
 * network failures; returns a tagged result instead.
 * @param {{
 *   baseUrl: string,
 *   key: string,
 *   method: "GET" | "POST",
 *   path: string,
 *   json?: unknown,
 *   headers?: Record<string, string>,
 *   timeoutMs: number,
 *   signal?: AbortSignal,
 * }} req
 * @returns {Promise<ApiResponse>}
 */
export async function apiRequest(req) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, req.timeoutMs);
  const onAbort = () => controller.abort();
  if (req.signal?.aborted) controller.abort();
  req.signal?.addEventListener("abort", onAbort, { once: true });

  /** @type {Record<string, string>} */
  const headers = {
    Authorization: `Bearer ${req.key}`,
    Accept: "application/json",
    "User-Agent": "clothsy-mcp/0.1.1",
    ...req.headers,
  };
  /** @type {RequestInit} */
  const init = { method: req.method, headers, signal: controller.signal, redirect: "error" };
  if (req.json !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(req.json);
  }

  try {
    const res = await fetch(`${req.baseUrl}${req.path}`, init);
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    const retryAfter = Number.isFinite(retryAfterHeader) && retryAfterHeader >= 0 ? retryAfterHeader : undefined;
    if (res.ok) return { ok: true, status: res.status, body, retryAfter };
    const code = typeof body?.code === "string" && body.code ? body.code : codeForStatus(res.status);
    const message = typeof body?.error === "string" && body.error ? body.error : `HTTP ${res.status}`;
    return { ok: false, status: res.status, body, code, message, retryAfter };
  } catch (error) {
    if (timedOut) return { ok: false, status: 0, body: null, code: "TIMEOUT", message: `No response within ${Math.round(req.timeoutMs / 1000)} s.` };
    if (req.signal?.aborted) return { ok: false, status: 0, body: null, code: "ABORTED", message: "Cancelled." };
    const cause = /** @type {any} */ (error)?.cause;
    const detail = cause?.code || cause?.message || /** @type {any} */ (error)?.message || String(error);
    return { ok: false, status: 0, body: null, code: "CONNECTION_ERROR", message: `Couldn't reach the API (${detail}).` };
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener("abort", onAbort);
  }
}

/** @param {number} status */
function codeForStatus(status) {
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

/** A fresh Idempotency-Key (8–128 of A-Za-z0-9_-). */
export function newIdempotencyKey() {
  return `mcp-test-${randomUUID()}`;
}

/**
 * Sleep that wakes early (and rejects) when the signal aborts.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("Cancelled."));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(undefined);
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new Error("Cancelled."));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
