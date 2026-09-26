// Reading request bodies without trusting their size.
//
// `request.json()` buffers whatever arrives, and a chunked request declares no
// Content-Length to check first — so a handful of slow multi-hundred-megabyte
// POSTs to any JSON route could exhaust the instance's memory before a single
// line of authentication ran. These readers stop at a byte cap instead.

/** Ample for every JSON API that does not carry an image. */
export const JSON_LIMIT = 64 * 1024;
/** Two images as base64 data URLs, with headroom. */
export const IMAGE_JSON_LIMIT = 24 * 1024 * 1024;

/** The body's bytes, or null once it passes `max`. */
export async function readBodyLimited(request: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function readTextLimited(request: Request, max = JSON_LIMIT): Promise<string | null> {
  const bytes = await readBodyLimited(request, max);
  return bytes ? new TextDecoder().decode(bytes) : null;
}

/**
 * A JSON object body, or `{}` when it is missing, malformed or oversized.
 *
 * Callers already treat `{}` as "no credentials", so an oversized body is
 * refused by the same path as an unauthenticated one.
 */
export async function readJsonLimited(
  request: Request,
  max = JSON_LIMIT,
): Promise<Record<string, unknown>> {
  const text = await readTextLimited(request, max);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
