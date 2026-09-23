// The page behind a shared link.
//
// Rendered as a string rather than through the app's React root: this is the
// one page in the product that is opened by people who have never heard of us,
// often inside a chat app's in-app browser, so it carries no client JavaScript
// and nothing that could fail to hydrate.

import type { SharedLook } from "@prisma/client";

const BRAND = "Clothsy AI";
const SITE = "https://clothsyai.fabricvton.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

/** Only ever link out to a real http(s) destination the store gave us. */
function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderLookPage(look: SharedLook, baseUrl: string) {
  const imageUrl = `${baseUrl}/look/${look.id}/image`;
  const productUrl = safeUrl(look.productUrl);
  const title = look.productTitle ? `${look.productTitle} — tried on with ${BRAND}` : `A try-on from ${BRAND}`;
  const description = look.productTitle
    ? `See how ${look.productTitle} looks, generated with ${BRAND} virtual try-on.`
    : `A virtual try-on generated with ${BRAND}.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta name="robots" content="noindex" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(imageUrl)}" />
<meta property="og:url" content="${escapeHtml(`${baseUrl}/look/${look.id}`)}" />
<meta name="twitter:card" content="summary_large_image" />
<style>
  :root {
    --ink: #101014; --muted: #74747e; --line: #e7e7ec; --soft: #f6f6f8; --accent: #6c4fe0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px calc(32px + env(safe-area-inset-bottom, 0px));
    background: var(--soft); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    display: flex; flex-direction: column; align-items: center; min-height: 100dvh;
  }
  .card {
    width: 100%; max-width: 420px; background: #fff; border: 1px solid var(--line);
    border-radius: 22px; overflow: hidden; box-shadow: 0 20px 50px rgba(16,16,20,.12);
  }
  .bar { display: flex; align-items: center; gap: 9px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
  .bar b { font-size: 15px; letter-spacing: -.01em; }
  .mark {
    width: 26px; height: 26px; border-radius: 8px; background: var(--accent); color: #fff;
    display: grid; place-items: center; font-weight: 700; font-size: 14px; font-family: inherit;
  }
  .shot { display: block; width: 100%; background: var(--soft); }
  .body { padding: 18px; }
  .name { margin: 0 0 4px; font-size: 17px; font-weight: 650; letter-spacing: -.01em; }
  .sub { margin: 0 0 16px; font-size: 13px; color: var(--muted); }
  .btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 52px; border-radius: 13px; text-decoration: none;
    font-size: 15px; font-weight: 600; background: var(--ink); color: #fff;
  }
  .btn-light { background: #fff; color: var(--ink); border: 1px solid var(--line); margin-top: 10px; }
  .foot { margin: 18px 0 0; font-size: 11.5px; color: var(--muted); text-align: center; }
  .foot a { color: var(--muted); }
</style>
</head>
<body>
  <div class="card">
    <div class="bar"><span class="mark">C</span><b>${BRAND}</b></div>
    <img class="shot" src="${escapeHtml(imageUrl)}" alt="A virtual try-on" />
    <div class="body">
      <p class="name">${escapeHtml(look.productTitle || "This look")}</p>
      <p class="sub">Tried on virtually with ${BRAND}. AI can make mistakes.</p>
      ${
        productUrl
          ? `<a class="btn" href="${escapeHtml(productUrl)}" rel="noopener">Shop this item</a>`
          : ""
      }
      <a class="btn btn-light" href="${SITE}" rel="noopener">Try it on yourself</a>
    </div>
  </div>
  <p class="foot">This link expires automatically. <a href="https://www.fabricvton.com/widget-privacy">Privacy notice</a></p>
</body>
</html>`;
}
