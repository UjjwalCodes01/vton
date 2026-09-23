import type { LoaderFunctionArgs } from "react-router";
import { getSharedLook, shareBaseUrl } from "../share/share.server";
import { renderLookPage } from "../share/lookpage.server";
import { logInternalError, newRequestId } from "../requestid.server";

// The page carries no JavaScript of its own and loads one image from this same
// origin, so it can afford the strictest policy there is. Defence in depth: the
// product title is already escaped, but a CSP means even a missed escape cannot
// execute anything.
const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// GET /look/<id> — the page behind a shared try-on link.

function gone() {
  return new Response(
    `<!doctype html><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />` +
      `<title>Link expired</title>` +
      `<body style="margin:0;display:grid;place-items:center;min-height:100dvh;background:#f6f6f8;` +
      `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#101014;text-align:center;padding:24px">` +
      `<div><h1 style="font-size:20px;margin:0 0 8px">This link has expired</h1>` +
      `<p style="color:#74747e;font-size:14px;margin:0">Shared try-ons are deleted automatically after 30 days.</p></div>`,
    { status: 404, headers: { ...PAGE_HEADERS, "Cache-Control": "no-store" } },
  );
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const look = await getSharedLook(params.id || "");
    if (!look) return gone();

    return new Response(renderLookPage(look, shareBaseUrl()), {
      status: 200,
      headers: {
        ...PAGE_HEADERS,
        // Long enough for a chat app to unfurl the preview without re-asking.
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    logInternalError(requestId, "look page", error);
    return gone();
  }
};
