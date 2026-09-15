// The hosted page a WooCommerce merchant pays on. Rendered as plain HTML (it is
// not part of the embedded Shopify app) and kept on our domain so the plugin
// never loads third-party payment scripts into WordPress admin.

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** JSON that is safe inside a <script> element. */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const TERMS_URL = "https://www.fabricvton.com/tos";

const MARK = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="6" fill="#6226FC"/><path d="M8.9 8.9h8.8l1.3 1.3v1.4h-7.3v5h7.3v2.5H8.9z" fill="#fff"/></svg>`;

function shell(title: string, body: string, script = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · Clothsy AI</title>
<style>
  :root { color-scheme: light; --brand: #6226FC; --ink: #1d1530; --muted: #6b6480; --line: #e7e3f0; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: #f6f4fb; display: grid; place-items: center; padding: 24px 16px; }
  main { width: 100%; max-width: 440px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(40, 20, 90, .08); }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; margin-bottom: 22px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .price { font-size: 30px; font-weight: 700; margin: 14px 0 2px; }
  .price span { font-size: 16px; font-weight: 400; color: var(--muted); }
  .muted { color: var(--muted); font-size: 14px; }
  ul { padding-left: 20px; margin: 18px 0; font-size: 14px; color: #3c3552; }
  li { margin: 6px 0; }
  button { width: 100%; border: 0; border-radius: 10px; padding: 14px; font: inherit; font-weight: 600; color: #fff; background: var(--brand); cursor: pointer; }
  button:disabled { opacity: .6; cursor: default; }
  .note { background: #f3effe; border-radius: 10px; padding: 12px 14px; font-size: 14px; margin: 16px 0; }
  .error { background: #fdecec; color: #8a1c1c; }
  a { color: var(--brand); }
  .back { display: inline-block; margin-top: 18px; font-size: 14px; }
</style>
</head>
<body>
<main>
  <div class="brand">${MARK}<span>Clothsy AI</span></div>
  ${body}
</main>
${script}
</body>
</html>`;
}

export function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // The checkout token is in this page's URL; keep it out of Referer
      // headers sent to the payment script's CDN.
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function messagePage(title: string, message: string, backUrl?: string, status = 200) {
  return htmlResponse(
    shell(
      title,
      `<h1>${esc(title)}</h1>
       <p class="muted">${esc(message)}</p>
       ${backUrl ? `<a class="back" href="${esc(backUrl)}">&larr; Back to your store</a>` : ""}`,
    ),
    status,
  );
}

export function checkoutPage(params: {
  planLabel: string;
  price: string;
  credits: number;
  storeName: string;
  startsAt: Date | null;
  replacingLabel: string | null;
  failed: boolean;
  returnUrl: string;
  razorpay: Record<string, unknown>;
}) {
  const { planLabel, price, credits, storeName, startsAt, replacingLabel, failed, returnUrl } = params;
  const startDate = startsAt?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  const timing = startsAt
    ? `<div class="note">Your plan changes to ${esc(planLabel)} on <strong>${esc(startDate!)}</strong>, when your current period ends. You won't be charged until then; your bank may show a small verification charge, which is refunded.</div>`
    : replacingLabel
      ? `<div class="note">${esc(planLabel)} starts as soon as payment goes through, with a full allowance. Your ${esc(replacingLabel)} plan ends at the same time; the unused part of its current month isn't refunded.</div>`
      : "";

  const body = `
    <h1>${esc(planLabel)} plan</h1>
    <div class="muted">for ${esc(storeName)}</div>
    <div class="price">${esc(price)} <span>/ month</span></div>
    <ul>
      <li>${credits.toLocaleString("en-US")} virtual try-ons every month</li>
      <li>Renews monthly. Cancel anytime in WooCommerce &rarr; Clothsy AI; your plan then runs to the end of the paid month.</li>
      <li>Payments are processed securely by our payment partner. Clothsy AI never sees your card details.</li>
    </ul>
    ${timing}
    ${failed ? `<div class="note error">The payment didn't go through. You can try again.</div>` : ""}
    <div id="dismissed" class="note error" hidden>Payment wasn't completed. You can try again whenever you're ready.</div>
    <button id="pay" type="button" disabled>${startsAt ? "Confirm plan change" : "Continue to payment"}</button>
    <p class="muted">By continuing you agree to the <a href="${TERMS_URL}" target="_blank" rel="noopener">Terms of Service</a>.</p>
    <a class="back" href="${esc(returnUrl)}">&larr; Back to your store</a>`;

  const script = `
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  (function () {
    var options = ${scriptJson(params.razorpay)};
    var button = document.getElementById("pay");
    options.modal = { ondismiss: function () { document.getElementById("dismissed").hidden = false; button.disabled = false; } };
    if (typeof Razorpay === "undefined") {
      button.textContent = "Payment is unavailable right now. Please reload the page.";
      return;
    }
    button.disabled = false;
    button.addEventListener("click", function () {
      button.disabled = true;
      new Razorpay(options).open();
    });
  })();
</script>`;

  return htmlResponse(shell(`${planLabel} plan`, body, script));
}
