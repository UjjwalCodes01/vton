import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL, CONTACT_EMAIL } from "../../../lib/site";
import { Code, CodeTabs } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "Add virtual try-on to a custom store",
  description:
    "How to add Clothsy AI virtual try-on to a store that isn't on Shopify or WooCommerce: architecture, uploading the shopper's photo, polling and showing the result.",
  alternates: { canonical: "/docs/api/custom-store" },
};

const BROWSER = `<!-- On the product page -->
<button id="tryon-open">Try it on</button>

<dialog id="tryon">
  <input id="tryon-photo" type="file" accept="image/jpeg,image/png" />
  <label>
    <input id="tryon-consent" type="checkbox" />
    I'm 18 or over, this is a photo of me, and I agree to it being processed
    to create a virtual try-on. <a href="/privacy">How we use it</a>
  </label>
  <button id="tryon-go">See it on me</button>
  <p id="tryon-status" role="status"></p>
  <img id="tryon-result" alt="You wearing this item" hidden />
</dialog>`;

const BROWSER_JS = `// Shrinks the photo to at most 1600px and re-encodes it as JPEG. This keeps it
// well under the 4 MB limit and drops the camera's EXIF data (including GPS).
async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
}

document.getElementById("tryon-go").addEventListener("click", async () => {
  const file = document.getElementById("tryon-photo").files[0];
  const status = document.getElementById("tryon-status");
  if (!file || !document.getElementById("tryon-consent").checked) {
    status.textContent = "Choose a photo and tick the box first.";
    return;
  }

  status.textContent = "Creating your try-on…";
  const form = new FormData();
  form.append("photo", await shrink(file), "photo.jpg");
  form.append("productId", window.PRODUCT_ID);       // your own product id
  form.append("requestId", crypto.randomUUID());      // one per click

  // YOUR server — never Clothsy's API directly. Your key stays there.
  const start = await fetch("/tryon", { method: "POST", body: form });
  const started = await start.json();
  if (!start.ok) { status.textContent = started.message; return; }

  // Ask your server every 2.5 seconds until the result is ready.
  for (let i = 0; i < 72; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch("/tryon/" + started.id);
    const body = await res.json();
    if (body.status === "success") {
      const img = document.getElementById("tryon-result");
      img.src = body.resultUrl;
      img.hidden = false;
      status.textContent = "";
      return;
    }
    if (body.status === "failed") { status.textContent = body.message; return; }
  }
  status.textContent = "This is taking longer than usual. Please try again.";
});`;

const START_SDK = `import express from "express";
import multer from "multer";
import { Clothsy, friendlyMessage } from "clothsy-ai";

const app = express();
const clothsy = new Clothsy();                                   // reads CLOTHSY_API_KEY
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } }); // the API's limit

// POST /tryon — called by your storefront, runs on your server.
app.post("/tryon", upload.single("photo"), async (req, res) => {
  const product = await db.products.find(req.body.productId);   // your catalogue
  if (!product || !req.file) return res.status(400).json({ message: "Missing photo or product." });

  try {
    const photo = await clothsy.images.upload(req.file.buffer, { contentType: "image/jpeg" });
    const tryon = await clothsy.tryons.create({
      person: { imageId: photo.id },
      garment: { url: product.imageUrl },     // your product photo, on HTTPS
      title: product.title,
      consent: true,                          // the shopper ticked the box
      idempotencyKey: req.body.requestId,     // same click => same try-on
    });
    res.status(202).json({ id: tryon.id });
  } catch (error) {
    res.status(error.status ?? 502).json({ message: friendlyMessage(error) });
  }
});`;

const START_HTTP = `const API = "${API_BASE_URL}";
const auth = { Authorization: \`Bearer \${process.env.CLOTHSY_API_KEY}\` };

// POST /tryon — called by your storefront, runs on your server.
app.post("/tryon", upload.single("photo"), async (req, res) => {
  const product = await db.products.find(req.body.productId);   // your catalogue
  if (!product || !req.file) return res.status(400).json({ message: "Missing photo or product." });

  // 1. Upload the photo. Free, and the id works for 24 hours.
  const form = new FormData();
  form.append("file", new Blob([req.file.buffer], { type: "image/jpeg" }), "photo.jpg");
  const uploaded = await fetch(\`\${API}/images\`, { method: "POST", headers: auth, body: form });
  const photo = await uploaded.json();
  if (!uploaded.ok) return res.status(uploaded.status).json({ message: messageFor(photo.code) });

  // 2. Start the try-on with the photo's id.
  const started = await fetch(\`\${API}/tryons\`, {
    method: "POST",
    headers: {
      ...auth,
      "Idempotency-Key": req.body.requestId,   // same click => same try-on
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personImageId: photo.id,
      garmentImageUrl: product.imageUrl,      // your product photo, on HTTPS
      title: product.title,
      consent: true,                          // the shopper ticked the box
    }),
  });
  const tryon = await started.json();
  if (!started.ok) return res.status(started.status).json({ message: messageFor(tryon.code) });
  res.status(202).json({ id: tryon.id });
});`;

const HOST_S3 = `import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.TRYON_PHOTO_BUCKET; // private bucket, not public

/** Stores the shopper's photo privately and returns a URL that works for 15 minutes. */
export async function hostPhoto(jpegBytes) {
  const key = \`tryon-photos/\${randomUUID()}.jpg\`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: jpegBytes, ContentType: "image/jpeg",
  }));
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 15 * 60,
  });
}

// Then, instead of uploading:
//   person: { url: await hostPhoto(req.file.buffer) }        (SDK)
//   personImageUrl: await hostPhoto(req.file.buffer)         (HTTP)`;

const POLL_SDK = `// GET /tryon/:id — your storefront polls this; it asks Clothsy for you.
app.get("/tryon/:id", async (req, res) => {
  try {
    const tryon = await clothsy.tryons.retrieve(req.params.id);
    res.json({ status: tryon.status, resultUrl: tryon.resultUrl, message: tryon.message });
  } catch (error) {
    res.status(error.status ?? 502).json({ message: friendlyMessage(error) });
  }
});`;

const POLL_HTTP = `// GET /tryon/:id — your storefront polls this; it asks Clothsy for you.
app.get("/tryon/:id", async (req, res) => {
  const response = await fetch(\`\${API}/tryons/\${encodeURIComponent(req.params.id)}\`, { headers: auth });
  const body = await response.json();
  if (!response.ok) return res.status(response.status).json({ message: messageFor(body.code) });
  res.json({ status: body.status, resultUrl: body.resultUrl, message: body.message });
});`;

const FRIENDLY = `// Only needed without the SDK — its friendlyMessage(error) does this for you.
function messageFor(code) {
  switch (code) {
    case "PERSON_PHOTO_REJECTED":
      return "Please use a clear, well-lit photo of just you, facing the camera.";
    case "IMAGE_REJECTED":
    case "GARMENT_REJECTED":
      return "Virtual try-on isn't available for this photo or item.";
    case "IMAGE_TOO_LARGE":
    case "UNSUPPORTED_IMAGE":
      return "Please use a JPEG or PNG photo under 4 MB.";
    case "RATE_LIMITED":
      return "Lots of people are trying things on right now. Try again in a minute.";
    case "INSUFFICIENT_CREDITS":   // alert yourself too: the button should go quiet
    default:
      return "Virtual try-on isn't available right now. Please try again later.";
  }
}`;

export default function CustomStoreGuide() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Guide</p>
      <h1 className="display">Add try-on to a custom store</h1>
      <p className="lede">
        For stores that aren&apos;t on Shopify or WooCommerce: a hand-built storefront, a headless setup, or your own app.
        You add a button and two small routes on your server; Clothsy AI does the rest.
      </p>

      <div className="doc-note">
        On <b>Shopify</b> or <b>WooCommerce</b>? Skip this — install the app or plugin and the button is added for you,
        with no code. Using <b>Next.js</b>? The <Link href="/docs/api/nextjs">Next.js guide</Link> gives you the route and
        the button ready-made.
      </div>

      <h2 id="architecture">How the pieces fit</h2>
      <ol className="doc-steps">
        <li>
          <b>The shopper&apos;s browser</b> shows a &ldquo;Try it on&rdquo; button, takes a photo and asks for consent. It
          only ever talks to <b>your</b> server.
        </li>
        <li>
          <b>Your server</b> uploads the photo to Clothsy AI, starts the try-on with your key, and relays progress back to
          the browser. It doesn&apos;t need to store the photo anywhere.
        </li>
        <li>
          <b>Clothsy AI</b> creates the try-on and hands back an image URL your storefront can display.
        </li>
      </ol>
      <p>
        Your API key lives only on your server. That&apos;s the one rule that matters: a key in browser code can be copied
        by anyone and used to spend your credits.
      </p>

      <h2 id="button">1. Add the button and consent</h2>
      <p>
        Put a button on the product page that opens a small panel for the photo. Ask for consent there, before anything is
        uploaded — the shopper must be an adult, it must be their own photo, and they must agree to it being processed.
      </p>
      <Code title="product-page.html" code={BROWSER} />
      <p>
        In the browser, shrink the photo before sending it. Phones take 5–12 MB photos; the API accepts up to 4 MB, and a
        1600-pixel JPEG is plenty for a try-on.
      </p>
      <Code title="tryon.js — runs in the browser" code={BROWSER_JS} />

      <h2 id="start">2. Upload the photo and start the try-on</h2>
      <p>
        Your <code>POST /tryon</code> route receives the photo from the browser, uploads it with{" "}
        <Link href="/docs/api/endpoints/upload-image">
          <code>POST /images</code>
        </Link>
        , and starts the try-on with the returned id. Uploading is free, and there&apos;s nothing to store or clean up on
        your side.
      </p>
      <p>
        Look the product up yourself instead of trusting a URL or title sent by the browser — otherwise anyone could use
        your credits to try on images you don&apos;t sell.
      </p>
      <CodeTabs
        tabs={[
          { label: "SDK (Node.js)", code: START_SDK },
          { label: "HTTP (fetch)", code: START_HTTP },
        ]}
      />
      <p>
        Use one <code>Idempotency-Key</code> per shopper click — here, the <code>requestId</code> the browser sends. If the
        request times out and is retried, the photo is simply uploaded again (it&apos;s free) and the same key returns the
        same try-on instead of charging twice.
      </p>

      <h3 id="host-the-photo">Alternative: host the photo yourself</h3>
      <p>
        If you already keep shopper photos in your own storage, you can pass a URL instead of uploading. Keep the file
        private and hand out a signed URL that expires in about 15 minutes — an S3 presigned URL, a Google Cloud Storage
        signed URL or a Cloudinary authenticated URL all work.
      </p>
      <Code title="host-photo.js — Amazon S3" code={HOST_S3} />
      <p>Whatever you use, the URL must:</p>
      <ul>
        <li>use HTTPS on the default port;</li>
        <li>
          return the image itself with HTTP 200 — <b>redirects are not followed</b>;
        </li>
        <li>respond within 12 seconds;</li>
        <li>point at a JPEG or PNG no larger than 4 MB.</li>
      </ul>
      <p>
        You&apos;re then responsible for deleting the photo afterwards. The simplest way is a lifecycle rule on the bucket
        folder that removes objects after one day, so nothing is left behind even if a request is abandoned halfway.
      </p>
      <p>
        Your garment images usually qualify as they are: a product photo on your CDN is fine as long as it meets the same
        rules.
      </p>

      <h2 id="poll">3. Poll through your server</h2>
      <p>
        The browser asks your server every few seconds; your server asks Clothsy AI. Poll every 2–3 seconds — most results
        arrive in under 30 seconds.
      </p>
      <CodeTabs
        tabs={[
          { label: "SDK (Node.js)", code: POLL_SDK },
          { label: "HTTP (fetch)", code: POLL_HTTP },
        ]}
      />
      <p>
        Show shoppers your own wording rather than raw API errors. The SDK&apos;s <code>friendlyMessage(error)</code> does
        this. Without the SDK, switch on <code>code</code>, not on the message text:
      </p>
      <Code title="server.js" code={FRIENDLY} />

      <h2 id="show">4. Show the result</h2>
      <p>
        When the status is <code>success</code>, put <code>resultUrl</code> into an <code>&lt;img&gt;</code>. It&apos;s
        served from Clothsy AI, works for 24 hours, and needs no key, so the browser can load it directly. Put your
        &ldquo;Add to cart&rdquo; button right next to it — that is the moment the shopper decides.
      </p>
      <p>
        Add a short caption such as &ldquo;AI-generated try-on&rdquo; under the image. The file is already labelled in its
        metadata, but shoppers can&apos;t see that — <Link href="/docs/api/ai-label">AI content label</Link> explains more.
      </p>

      <h2 id="checklist">Before you launch</h2>
      <ul>
        <li>The API key is only in server environment variables — not in your frontend bundle or repository.</li>
        <li>The consent checkbox is required before anything is uploaded.</li>
        <li>
          Your privacy policy says shopper photos are processed by a virtual try-on service to create the image, and
          that uploaded photos are kept for up to 35 days, then deleted automatically.
        </li>
        <li>You look products up on your server instead of trusting image URLs from the browser.</li>
        <li>Try-on results are captioned as AI-generated.</li>
        <li>
          You handle <code>INSUFFICIENT_CREDITS</code> — hide the button and alert yourself — so shoppers don&apos;t see a
          broken feature.
        </li>
        <li>
          You know your limits: each account can start 12 try-ons a minute and upload 30 images a minute. Expecting more
          try-ons than that at peak? <a href={`mailto:${CONTACT_EMAIL}`}>Tell us</a> and we&apos;ll raise it.
        </li>
      </ul>
      <p>
        Complete, copy-paste servers in Node.js, Python and Next.js are in{" "}
        <Link href="/docs/api/examples">Full examples</Link>.
      </p>

      <Pager current="/docs/api/custom-store" />
    </>
  );
}
