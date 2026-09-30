import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL, PLATFORM_URL } from "../../lib/site";
import { Code } from "../components/Code";
import Pager from "../components/Pager";

export const metadata: Metadata = {
  title: "Try-on API — Introduction",
  description:
    "Add Clothsy AI virtual try-on to any store or app: send a photo and a garment, get back the shopper wearing it. HTTP API, TypeScript SDK and Next.js helpers.",
  alternates: { canonical: "/docs/api" },
};

const SDK_SAMPLE = `import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

const photo = await clothsy.images.upload(photoBytes, { contentType: "image/jpeg" });
const tryon = await clothsy.tryons.run({
  person: { imageId: photo.id },
  garment: { url: product.imageUrl },
  title: product.title,
  consent: true,
});

console.log(tryon.resultUrl);`;

function FlowDiagram() {
  const lane = { you: 130, us: 510 };
  const arrow = (y: number, from: number, to: number, label: string, dashed = false) => (
    <g>
      <line
        x1={from}
        y1={y}
        x2={to}
        y2={y}
        stroke="var(--violet)"
        strokeWidth="1.6"
        strokeDasharray={dashed ? "5 5" : undefined}
        markerEnd="url(#head)"
      />
      <text x={(from + to) / 2} y={y - 10} textAnchor="middle" fontSize="14" fill="var(--ink)">
        {label}
      </text>
    </g>
  );

  return (
    <div className="doc-diagram">
      <svg viewBox="0 0 640 470" role="img" aria-labelledby="flow-title">
        <title id="flow-title">
          Optionally, your server first uploads the shopper&apos;s photo with POST /api/v1/images and receives an image id.
          It then starts a try-on with POST /api/v1/tryons, receives a try-on id, and polls GET /api/v1/tryons/id until
          the status is success and a resultUrl is returned.
        </title>
        <defs>
          <marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--violet)" />
          </marker>
        </defs>
        {[
          ["Your server", lane.you],
          ["Clothsy AI", lane.us],
        ].map(([label, x]) => (
          <g key={label as string}>
            <rect x={(x as number) - 80} y="8" width="160" height="46" rx="10" fill="var(--lav-1)" stroke="var(--lav-3)" />
            <text x={x as number} y="37" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--ink)">
              {label}
            </text>
            <line x1={x as number} y1="54" x2={x as number} y2="460" stroke="var(--lav-3)" strokeWidth="1.5" />
          </g>
        ))}
        <rect x="70" y="72" width="500" height="92" rx="8" fill="none" stroke="var(--lav-3)" strokeDasharray="3 4" />
        <text x="84" y="90" fontSize="12.5" fill="var(--muted)" fontWeight="600">
          optional
        </text>
        {arrow(115, lane.you, lane.us, "POST /images  (shopper photo file)")}
        {arrow(150, lane.us, lane.you, "201  { id: \"img_…\" }", true)}
        {arrow(210, lane.you, lane.us, "POST /tryons  (photo, garment, consent)")}
        {arrow(255, lane.us, lane.you, "202  { id, status: \"pending\" }", true)}
        <rect x="70" y="285" width="500" height="80" rx="8" fill="none" stroke="var(--violet)" strokeDasharray="3 4" />
        <text x="84" y="304" fontSize="12.5" fill="var(--violet)" fontWeight="600">
          every 2–3 seconds
        </text>
        {arrow(342, lane.you, lane.us, "GET /tryons/{id}")}
        {arrow(420, lane.us, lane.you, "{ status: \"success\", resultUrl }", true)}
      </svg>
    </div>
  );
}

export default function ApiIntroduction() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Get started</p>
      <h1 className="display">Introduction</h1>
      <p className="lede">
        Add AI virtual try-on to any store or app: send a photo of the shopper and an image of a garment, and get back a
        photo of the shopper wearing it.
      </p>
      <p>
        On Shopify or WooCommerce you don&apos;t need any of this — install the app or plugin and the try-on button is
        added for you. The API is for everything else: custom storefronts, headless commerce, mobile apps and in-house
        tools.
      </p>

      <h2 id="basics">Basics</h2>
      <div className="doc-table">
        <table>
          <tbody>
            <tr>
              <td>Base URL</td>
              <td>
                <code>{API_BASE_URL}</code>
              </td>
            </tr>
            <tr>
              <td>Auth</td>
              <td>
                <code>Authorization: Bearer clothsy_live_…</code> on every request. Create your key in the{" "}
                <a href={`${PLATFORM_URL}/api-keys`}>Clothsy AI platform</a> under Developer API.
              </td>
            </tr>
            <tr>
              <td>Price</td>
              <td>
                1 credit per finished try-on. A try-on that fails is refunded automatically. Your first key comes with{" "}
                <b>20 free credits</b>, once per account.
              </td>
            </tr>
            <tr>
              <td>Images</td>
              <td>
                JPEG or PNG, up to 4 MB each. <Link href="/docs/api/images">Upload</Link> a file to get an id that works for
                24 hours, or pass a public HTTPS URL.
              </td>
            </tr>
            <tr>
              <td>Getting the result</td>
              <td>
                Start a try-on and <Link href="/docs/api/endpoints/get-try-on">poll</Link> for it, or use the{" "}
                <Link href="/docs/api/endpoints/create-try-on-sync">sync endpoint</Link>, which waits up to about 55
                seconds and returns the finished image in the same call.
              </td>
            </tr>
            <tr>
              <td>SDK</td>
              <td>
                <Link href="/docs/api/sdk">
                  <code>clothsy-ai</code>
                </Link>{" "}
                for TypeScript and JavaScript, with a ready-made <Link href="/docs/api/nextjs">Next.js</Link> route and
                button. Or call the HTTP API from any language.
              </td>
            </tr>
            <tr>
              <td>Speed</td>
              <td>Most results are ready in under 30 seconds.</td>
            </tr>
            <tr>
              <td>Errors</td>
              <td>
                JSON <code>{"{ error, code }"}</code>. Branch on <code>code</code>. See{" "}
                <Link href="/docs/api/errors">Errors &amp; limits</Link>.
              </td>
            </tr>
            <tr>
              <td>Where to call it</td>
              <td>From your server only. Your key must never reach a browser or a mobile app bundle.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="how-it-works">How it works</h2>
      <FlowDiagram />
      <ol className="doc-steps">
        <li>
          <b>Upload the photo (optional).</b> <code>POST /images</code> with the shopper&apos;s photo file returns an{" "}
          <code>img_…</code> id. Skip this if the photo already has a public HTTPS URL.
        </li>
        <li>
          <b>Start the try-on.</b> <code>POST /tryons</code> with the shopper&apos;s photo and the garment image — each as
          an uploaded id or a URL — plus <code>consent: true</code>. You get an <code>id</code> back straight away.
        </li>
        <li>
          <b>Poll it.</b> <code>GET /tryons/{"{id}"}</code> every 2–3 seconds until <code>status</code> is{" "}
          <code>success</code> or <code>failed</code>.
        </li>
        <li>
          <b>Show the result.</b> <code>resultUrl</code> is an image your shopper&apos;s browser can load directly for the
          next 24 hours.
        </li>
      </ol>
      <p>With the SDK, the whole flow is a few lines:</p>
      <Code title="tryon.ts" code={SDK_SAMPLE} />
      <p>
        Every result carries a machine-readable label saying it was made with AI.{" "}
        <Link href="/docs/api/ai-label">AI content label</Link> explains it, and why you should also say so on screen.
      </p>

      <div className="doc-note">
        <b>Send the product title.</b> A title such as &ldquo;Cropped denim jacket&rdquo; tells the engine what kind of
        garment it is placing, which gives better results than an image alone.
      </div>

      <h2 id="what-you-need">What you need</h2>
      <ul>
        <li>
          A Clothsy AI account and an API key — <a href={`${PLATFORM_URL}/login`}>sign in with Google</a>, then open
          Developer API.
        </li>
        <li>
          A server to call the API from — any language works. For JavaScript there&apos;s the{" "}
          <Link href="/docs/api/sdk">TypeScript SDK</Link>, which runs on Node.js 18+, Deno, Bun and edge runtimes.
        </li>
        <li>The shopper&apos;s agreement: they must be an adult, and must agree to their photo being processed.</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <div className="doc-cards">
        <Link className="doc-card" href="/docs/api/quickstart">
          <b>Quickstart</b>
          <span>Your first try-on in five minutes, with the SDK, curl or Python.</span>
        </Link>
        <Link className="doc-card" href="/docs/api/nextjs">
          <b>Next.js</b>
          <span>A route handler and a drop-in button, in three steps.</span>
        </Link>
        <Link className="doc-card" href="/docs/api/sdk">
          <b>TypeScript SDK</b>
          <span>Uploads, try-ons, waiting, retries and typed errors.</span>
        </Link>
        <Link className="doc-card" href="/docs/api/custom-store">
          <b>Add try-on to a custom store</b>
          <span>The full shape of a storefront integration.</span>
        </Link>
        <Link className="doc-card" href="/docs/api/endpoints/create-try-on">
          <b>Endpoints</b>
          <span>Every field, header and response.</span>
        </Link>
        <Link className="doc-card" href="/docs/api/examples">
          <b>Full examples</b>
          <span>Working Node.js, Python and Next.js stores.</span>
        </Link>
      </div>

      <Pager current="/docs/api" />
    </>
  );
}
