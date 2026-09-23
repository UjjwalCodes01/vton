import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { cachedResultUrl, rememberResultUrl, verifyImageToken } from "../share/imageproxy.server";
import { getGenerationStatus } from "../youcam.server";
import { logInternalError, newRequestId } from "../requestid.server";

// GET /i/<token> — a try-on result, served from our domain.
//
// The token is signed and carries the shop, so it cannot be pointed at another
// store's generation, and the provider's hostname never reaches the browser.

const NOT_FOUND = new Response("Not found", { status: 404 });

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  const claims = verifyImageToken(params.token || "");
  if (!claims) return NOT_FOUND;

  try {
    // Scoped by shop as well as task id: a token is only ever valid for the
    // generation belonging to the shop it was signed for.
    const event = await db.tryOnEvent.findFirst({
      where: { shop: claims.shop, providerTaskId: claims.taskId },
      select: { id: true },
    });
    if (!event) return NOT_FOUND;

    let url = cachedResultUrl(claims.taskId);
    if (!url) {
      const generation = await getGenerationStatus(claims.taskId);
      if (!generation.resultImageUrl) return NOT_FOUND;
      url = generation.resultImageUrl;
      rememberResultUrl(claims.taskId, url);
    }

    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) return NOT_FOUND;

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        // Private: this is one shopper's own likeness, not something a shared
        // cache should hold for anyone else who asks.
        "Cache-Control": "private, max-age=1800",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logInternalError(requestId, "image proxy", error);
    return NOT_FOUND;
  }
};
