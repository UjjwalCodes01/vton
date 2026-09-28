import { cfg } from "./config.js";
import { upstream } from "./upstream.js";
import { getSecret, invalidateSecret } from "./keyPool.js";
import type { KeyRecord } from "./types.js";
import { classifyProviderResponse } from "./providerClassify.js";

export type ProviderResult =
  | { kind: "success"; status: number; body: unknown }
  | { kind: "quota"; status: number }
  | { kind: "auth"; status: number }
  | { kind: "temporary"; status: number }
  | { kind: "error"; status: number };

async function readLimited(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > cfg.maxUpstreamResponseBytes) {
    throw new Error("upstream_response_too_large");
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > cfg.maxUpstreamResponseBytes) {
          await reader.cancel();
          throw new Error("upstream_response_too_large");
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function callProvider(
  key: KeyRecord,
  requestId: string,
  method: "GET" | "POST",
  path: string,
  payload?: unknown
): Promise<ProviderResult> {
  const secret = await getSecret(key.secretId, key.secretKeyId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(`${upstream.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${secret.apiKey}`,
        "accept": "application/json",
        "idempotency-key": requestId,
        "user-agent": "secure-api-key-pool/2.0"
      },
      ...(method === "POST" ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
      redirect: "error"
    });

    const bodyText = await readLimited(response);
    const kind = classifyProviderResponse(response.status, bodyText);

    if (kind === "success") {
      let body: unknown;
      try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = bodyText; }
      return { kind, status: response.status, body };
    }

    if (kind === "auth") invalidateSecret(key.secretId);
    return { kind, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}
