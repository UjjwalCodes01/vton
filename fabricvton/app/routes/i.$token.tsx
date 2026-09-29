import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { cachedResultUrl, rememberResultUrl, verifyImageToken } from "../share/imageproxy.server";
import { stripImageMetadata } from "../share/imagemeta.server";
import { getGenerationStatus } from "../engine.server";
import { logInternalError, newRequestId } from "../requestid.server";
import { fetchScreenedResult } from "../safety.server";

// GET /i/<token> — a try-on result, served from our domain.
//
// The token is signed, expires, and names our own event, so the generator's
// hostname and ids never reach the browser. The bytes are re-wrapped without
// their embedded metadata before they leave.

const NOT_FOUND = () => new Response("Not found", { status: 404 });

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

    const raw = await fetchScreenedResult(url);

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
        // Keep each request behind the safety check and avoid caching a likeness.
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logInternalError(requestId, "image proxy", error);
    return NOT_FOUND();
  }
};
