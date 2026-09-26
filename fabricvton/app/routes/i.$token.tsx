import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { cachedResultUrl, rememberResultUrl, verifyImageToken } from "../share/imageproxy.server";
import { stripImageMetadata } from "../share/imagemeta.server";
import { getGenerationStatus } from "../youcam.server";
import { logInternalError, newRequestId } from "../requestid.server";

// GET /i/<token> — a try-on result, served from our domain.
//
// The token is signed, expires, and names our own event, so the generator's
// hostname and ids never reach the browser. The bytes are re-wrapped without
// their embedded metadata before they leave.

const NOT_FOUND = () => new Response("Not found", { status: 404 });
/** Results are a few megabytes; anything far past that is not one. */
const MAX_RESULT_BYTES = 25 * 1024 * 1024;

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  const claims = verifyImageToken(params.token || "");
  if (!claims) return NOT_FOUND();

  try {
    const event = await db.tryOnEvent.findUnique({
      where: { id: claims.eventId },
      select: { status: true, providerTaskId: true },
    });
    // Only a generation that was settled — and so billed — is ever served. A
    // pending or reclaimed one has not been paid for.
    if (!event || event.status !== "success" || !event.providerTaskId) return NOT_FOUND();

    const taskId = event.providerTaskId;
    let url = cachedResultUrl(taskId);
    if (!url) {
      const generation = await getGenerationStatus(taskId);
      if (!generation.resultImageUrl) return NOT_FOUND();
      url = generation.resultImageUrl;
      rememberResultUrl(taskId, url);
    }

    const upstream = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!upstream.ok) return NOT_FOUND();
    const declared = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_RESULT_BYTES) return NOT_FOUND();

    const raw = new Uint8Array(await upstream.arrayBuffer());
    if (raw.byteLength > MAX_RESULT_BYTES) return NOT_FOUND();

    const clean = stripImageMetadata(raw);
    if (!clean) {
      // Never pass through a format we cannot clean.
      logInternalError(requestId, "image proxy", new Error("Unrecognised result image format"));
      return NOT_FOUND();
    }

    return new Response(new Blob([clean.bytes as Uint8Array<ArrayBuffer>]), {
      status: 200,
      headers: {
        "Content-Type": clean.type,
        // Private: this is one shopper's own likeness, not something a shared
        // cache should hold for anyone else who asks.
        "Cache-Control": "private, max-age=1800",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logInternalError(requestId, "image proxy", error);
    return NOT_FOUND();
  }
};
