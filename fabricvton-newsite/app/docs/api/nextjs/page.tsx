import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, PLATFORM_URL } from "../../../lib/site";
import { Code } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "Next.js — Try-on API",
  description:
    "Add Clothsy AI virtual try-on to a Next.js App Router store in three steps: one route handler, one environment variable and a drop-in React button.",
  alternates: { canonical: "/docs/api/nextjs" },
};

const INSTALL = `npm install clothsy-ai`;

const ENV = `CLOTHSY_API_KEY=clothsy_live_...`;

const ROUTE = `import { createTryOnRoute } from "clothsy-ai/next";
import { getProduct } from "@/lib/catalog";

export const maxDuration = 60; // gives each request up to 60 s on Vercel

export const { POST, GET } = createTryOnRoute({
  resolveProduct: async (productId) => {
    const product = await getProduct(productId);            // your catalogue
    return product ? { imageUrl: product.imageUrl, title: product.title } : null;
  },
});`;

const BUTTON = `import { TryOnButton } from "clothsy-ai/react";
import { getProduct } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return null;

  return (
    <main>
      <h1>{product.title}</h1>
      <img src={product.imageUrl} alt={product.title} />
      <TryOnButton productId={product.id} endpoint="/api/tryon" label="Try it on" />
    </main>
  );
}`;

const THEME_TSX = `<TryOnButton
  productId={product.id}
  endpoint="/api/tryon"
  label="Try it on"
  className="product-tryon"
/>`;

const THEME_CSS = `/* app/globals.css */
.product-tryon {
  --clothsy-accent: #7c3aed;   /* your brand colour */
}`;

const HOOK = `"use client";

import { useState } from "react";
import { useTryOn } from "clothsy-ai/react";

export function MyTryOn({ productId }: { productId: string }) {
  const { state, start, reset, resultUrl, error } = useTryOn({ endpoint: "/api/tryon" });
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  if (resultUrl) {
    return (
      <figure>
        <img src={resultUrl} alt="AI-generated preview of you wearing this item" />
        <figcaption>AI-generated try-on</figcaption>
        <button onClick={reset}>Try another photo</button>
      </figure>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (file && agreed) start(file, productId);
      }}
    >
      <input type="file" accept="image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I&apos;m 18 or over, this is a photo of me, and I agree to it being processed to create a virtual try-on.
      </label>
      <button type="submit" disabled={!file || !agreed}>See it on me</button>
      <p role="status">{state}</p>
      {error ? <p role="alert">We couldn&apos;t create your try-on. Please try another photo.</p> : null}
    </form>
  );
}`;

export default function NextJsGuide() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Get started</p>
      <h1 className="display">Next.js</h1>
      <p className="lede">
        On the App Router, adding try-on takes one route handler, one environment variable and a button. The{" "}
        <code>clothsy-ai</code> package ships all three pieces.
      </p>

      <h2 id="how">How it fits together</h2>
      <ol className="doc-steps">
        <li>
          <b>The button</b> runs in the shopper&apos;s browser. It collects a photo and consent, and talks only to your
          own route.
        </li>
        <li>
          <b>Your route</b> at <code>/api/tryon</code> holds the API key. It looks the product up in your catalogue,
          uploads the photo and starts the try-on.
        </li>
        <li>
          <b>Clothsy AI</b> makes the image. The button polls your route and shows the result.
        </li>
      </ol>

      <h2 id="install">1. Install and add your key</h2>
      <Code title="Terminal" code={INSTALL} />
      <p>
        Create a key under Developer API in the <a href={`${PLATFORM_URL}/api-keys`}>Clothsy AI platform</a> and add it to{" "}
        <code>.env.local</code>. Don&apos;t give it a <code>NEXT_PUBLIC_</code> prefix — that would put it in the browser
        bundle.
      </p>
      <Code title=".env.local" code={ENV} />

      <h2 id="route">2. Add the route handler</h2>
      <p>
        Create <code>app/api/tryon/route.ts</code>. The only thing you write is <code>resolveProduct</code>: given a
        product id from the browser, return that product&apos;s image URL and title from your own catalogue, or{" "}
        <code>null</code> if there&apos;s no such product.
      </p>
      <Code title="app/api/tryon/route.ts" code={ROUTE} />
      <p>What the two handlers do:</p>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th>Request</th>
              <th>What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /api/tryon</code>
              </td>
              <td>
                Takes a multipart form with <code>photo</code>, <code>productId</code>, <code>consent</code> and{" "}
                <code>requestId</code>. Uploads the photo, starts the try-on for the product your{" "}
                <code>resolveProduct</code> returned, and responds with <code>{"{ id }"}</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>GET /api/tryon?id=…</code>
              </td>
              <td>
                Responds with <code>{"{ status, resultUrl, message }"}</code> for that try-on.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          The key is read from <code>CLOTHSY_API_KEY</code> on the server and never leaves it.
        </li>
        <li>
          Requests from other websites are refused: both handlers check that the call comes from your own origin.
        </li>
        <li>
          The garment always comes from <code>resolveProduct</code>, never from the browser, so nobody can spend your
          credits on images you don&apos;t sell.
        </li>
        <li>
          <code>requestId</code> is used as the idempotency key, so a double click or a retried request starts one try-on,
          not two.
        </li>
      </ul>

      <h2 id="button">3. Add the button</h2>
      <p>
        Put <code>TryOnButton</code> on your product page. It&apos;s a client component, so you can use it inside a server
        component as it is.
      </p>
      <Code title="app/products/[id]/page.tsx" code={BUTTON} />
      <p>When a shopper clicks it, the button:</p>
      <ul>
        <li>opens a dialog with a photo picker;</li>
        <li>asks for consent with a checkbox that must be ticked before anything is sent;</li>
        <li>shrinks the photo in the browser to a 1600-pixel JPEG, which keeps it under the 4 MB limit and drops camera metadata such as location;</li>
        <li>sends it to your route, polls for the result, and shows the finished image.</li>
      </ul>
      <p>
        That&apos;s the whole integration. Link your privacy policy near the button and say that shopper photos are
        processed by a virtual try-on service; ours is at <Link href={LEGAL.shopperPrivacy}>shopper privacy</Link> if
        you&apos;d like to point to it.
      </p>

      <h2 id="styling">Customising the look</h2>
      <p>
        The button and dialog are themed with CSS custom properties such as <code>--clothsy-accent</code>, and accept a{" "}
        <code>className</code> so you can scope your overrides. Set the properties on that class, or on any parent
        element:
      </p>
      <Code title="app/products/[id]/page.tsx" code={THEME_TSX} />
      <Code title="app/globals.css" code={THEME_CSS} />
      <div className="doc-table">
        <table>
          <thead>
            <tr><th>Custom property</th><th>Controls</th></tr>
          </thead>
          <tbody>
            <tr><td><code>--clothsy-accent</code></td><td>Button and highlight colour</td></tr>
            <tr><td><code>--clothsy-accent-contrast</code></td><td>Text on the accent colour</td></tr>
            <tr><td><code>--clothsy-bg</code></td><td>Dialog background</td></tr>
            <tr><td><code>--clothsy-text</code></td><td>Main text colour</td></tr>
            <tr><td><code>--clothsy-muted</code></td><td>Secondary text</td></tr>
            <tr><td><code>--clothsy-border</code></td><td>Borders and dividers</td></tr>
            <tr><td><code>--clothsy-error</code></td><td>Error messages</td></tr>
            <tr><td><code>--clothsy-backdrop</code></td><td>The shade behind the dialog</td></tr>
            <tr><td><code>--clothsy-font</code></td><td>Font family</td></tr>
            <tr><td><code>--clothsy-radius</code></td><td>Corner radius of buttons and inputs</td></tr>
            <tr><td><code>--clothsy-radius-lg</code></td><td>Corner radius of the dialog</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="custom-ui">Build your own UI with useTryOn</h2>
      <p>
        Want complete control over the markup? The <code>useTryOn</code> hook gives you the same logic without any UI. It
        returns:
      </p>
      <ul>
        <li>
          <code>start(file, productId)</code> — sends the photo to your route and starts polling;
        </li>
        <li>
          <code>state</code> — where the try-on is up to: <code>&quot;idle&quot;</code>, <code>&quot;preparing&quot;</code>{" "}
          (resizing the photo), <code>&quot;uploading&quot;</code>, <code>&quot;processing&quot;</code>,{" "}
          <code>&quot;success&quot;</code> or <code>&quot;error&quot;</code>;
        </li>
        <li>
          <code>resultUrl</code> — the finished image once it&apos;s ready;
        </li>
        <li>
          <code>error</code> — a message you can show the shopper when <code>state</code> is <code>&quot;error&quot;</code>,
          otherwise <code>null</code>;
        </li>
        <li>
          <code>reset()</code> — clears everything for another go.
        </li>
      </ul>
      <p>
        The hook doesn&apos;t draw a consent checkbox, so you must: only call <code>start</code> once the shopper has
        ticked yours. Also label the result as AI-generated — see <Link href="/docs/api/ai-label">AI content label</Link>.
      </p>
      <Code title="app/components/MyTryOn.tsx" code={HOOK} />

      <h2 id="vercel">Deploying on Vercel</h2>
      <ol>
        <li>
          Add <code>CLOTHSY_API_KEY</code> under <b>Settings → Environment Variables</b> for Production (and Preview, if you
          want try-on there too), then redeploy.
        </li>
        <li>
          Keep <code>export const maxDuration = 60</code> in the route file. Starting a try-on uploads the photo and waits
          for the API to accept it, and the extra headroom stops that being cut short by a lower default function limit.
        </li>
        <li>
          Photos from <code>TryOnButton</code> are already resized in the browser, so they stay well under Vercel&apos;s
          request body limit for functions.
        </li>
      </ol>
      <p>
        A complete store with a catalogue, route and product page is in{" "}
        <Link href="/docs/api/examples#nextjs">Full examples</Link>.
      </p>

      <Pager current="/docs/api/nextjs" />
    </>
  );
}
