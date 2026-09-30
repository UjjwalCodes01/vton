import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../lib/site";
import { Code } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "Try-on API — Full examples",
  description: "Complete Node.js, Python and Next.js stores that add Clothsy AI virtual try-on, ready to copy.",
  alternates: { canonical: "/docs/api/examples" },
};

const NODE_PKG = `npm install express multer clothsy-ai
node --env-file=.env server.mjs`;

const NODE_ENV = `CLOTHSY_API_KEY=clothsy_live_...`;

const NODE = `// server.mjs — Node.js 20+
import express from "express";
import multer from "multer";
import { Clothsy, InsufficientCreditsError, friendlyMessage } from "clothsy-ai";

const app = express();
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } });   // matches the API limit
const clothsy = new Clothsy();                                        // reads CLOTHSY_API_KEY

// Replace with your own catalogue lookup.
const PRODUCTS = {
  "denim-jacket": { title: "Cropped denim jacket", imageUrl: "https://cdn.example.com/denim-jacket.jpg" },
};

function sendError(res, error) {
  if (error instanceof InsufficientCreditsError) console.error("Clothsy credits are used up — top up.");
  else console.error(error);
  res.status(error.status ?? 502).json({ message: friendlyMessage(error) });
}

app.post("/tryon", upload.single("photo"), async (req, res) => {
  const product = PRODUCTS[req.body.productId];
  if (!product || !req.file) return res.status(400).json({ message: "Missing photo or product." });
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(req.body.requestId || "")) {
    return res.status(400).json({ message: "Missing request id." });
  }

  try {
    const photo = await clothsy.images.upload(req.file.buffer, {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
    const tryon = await clothsy.tryons.create({
      person: { imageId: photo.id },
      garment: { url: product.imageUrl },
      title: product.title,
      consent: true,
      idempotencyKey: req.body.requestId,
    });
    res.status(202).json({ id: tryon.id });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/tryon/:id", async (req, res) => {
  try {
    const tryon = await clothsy.tryons.retrieve(req.params.id);
    res.json({ status: tryon.status, resultUrl: tryon.resultUrl, message: tryon.message });
  } catch (error) {
    sendError(res, error);
  }
});

app.use(express.static("public"));   // your storefront, with tryon.js
app.listen(3000, () => console.log("Listening on http://localhost:3000"));`;

const PY_PKG = `pip install flask requests
export CLOTHSY_API_KEY=clothsy_live_...
python app.py`;

const PY = `# app.py — Python 3.10+
import os, re
import requests
from flask import Flask, jsonify, request

API = "${API_BASE_URL}"
KEY = os.environ["CLOTHSY_API_KEY"]

app = Flask(__name__, static_folder="public", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024   # a 4 MB photo plus the form fields

# Replace with your own catalogue lookup.
PRODUCTS = {
    "denim-jacket": {"title": "Cropped denim jacket", "imageUrl": "https://cdn.example.com/denim-jacket.jpg"},
}

def friendly_message(code=None):
    if code == "PERSON_PHOTO_REJECTED":
        return "Please use a clear photo of just you, facing the camera."
    if code in ("IMAGE_TOO_LARGE", "UNSUPPORTED_IMAGE"):
        return "Please use a JPEG or PNG under 4 MB."
    if code == "RATE_LIMITED":
        return "Lots of people are trying things on. Try again in a minute."
    return "Virtual try-on isn't available right now. Please try again later."

def clothsy(method, path, **kwargs):
    headers = {"Authorization": f"Bearer {KEY}", **kwargs.pop("headers", {})}
    res = requests.request(method, API + path, headers=headers, timeout=60, **kwargs)
    return res.status_code, res.json()

@app.post("/tryon")
def start_tryon():
    product = PRODUCTS.get(request.form.get("productId", ""))
    photo = request.files.get("photo")
    request_id = request.form.get("requestId", "")
    if not product or not photo or not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", request_id):
        return jsonify(message="Missing photo, product or request id."), 400

    # 1. Upload the photo. Free, and the id works for 24 hours.
    status, uploaded = clothsy("POST", "/images", files={"file": ("photo.jpg", photo.read(), "image/jpeg")})
    if status >= 400:
        return jsonify(message=friendly_message(uploaded.get("code"))), status

    # 2. Start the try-on with the photo's id.
    status, body = clothsy(
        "POST", "/tryons",
        headers={"Idempotency-Key": request_id},
        json={
            "personImageId": uploaded["id"],
            "garmentImageUrl": product["imageUrl"],
            "title": product["title"],
            "consent": True,
        },
    )
    if status >= 400:
        if body.get("code") == "INSUFFICIENT_CREDITS":
            app.logger.error("Clothsy credits are used up — top up.")
        return jsonify(message=friendly_message(body.get("code"))), status
    return jsonify(id=body["id"]), 202

@app.get("/tryon/<tryon_id>")
def poll_tryon(tryon_id):
    status, body = clothsy("GET", f"/tryons/{tryon_id}")
    if status >= 400:
        return jsonify(message=friendly_message(body.get("code"))), status
    return jsonify(status=body["status"], resultUrl=body.get("resultUrl"), message=body.get("message"))

if __name__ == "__main__":
    app.run(port=3000)`;

const NEXT_PKG = `npx create-next-app@latest my-store
cd my-store
npm install clothsy-ai`;

const NEXT_ENV = `CLOTHSY_API_KEY=clothsy_live_...`;

const NEXT_CATALOG = `// Replace with your real catalogue: a database, a CMS or a commerce API.
export type Product = { id: string; title: string; price: string; imageUrl: string };

const PRODUCTS: Product[] = [
  {
    id: "denim-jacket",
    title: "Cropped denim jacket",
    price: "$79",
    imageUrl: "https://cdn.example.com/denim-jacket.jpg",
  },
  {
    id: "linen-shirt",
    title: "Relaxed linen shirt",
    price: "$45",
    imageUrl: "https://cdn.example.com/linen-shirt.jpg",
  },
];

export async function getProduct(id: string): Promise<Product | null> {
  return PRODUCTS.find((product) => product.id === id) ?? null;
}`;

const NEXT_ROUTE = `import { createTryOnRoute } from "clothsy-ai/next";
import { getProduct } from "@/lib/catalog";

export const maxDuration = 60;

export const { POST, GET } = createTryOnRoute({
  resolveProduct: async (productId) => {
    const product = await getProduct(productId);            // your catalogue
    return product ? { imageUrl: product.imageUrl, title: product.title } : null;
  },
});`;

const NEXT_PAGE = `import { notFound } from "next/navigation";
import { TryOnButton } from "clothsy-ai/react";
import { getProduct } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <main className="product">
      <img src={product.imageUrl} alt={product.title} />
      <div>
        <h1>{product.title}</h1>
        <p>{product.price}</p>
        <TryOnButton
          productId={product.id}
          endpoint="/api/tryon"
          label="Try it on"
          className="product-tryon"
        />
        <p className="small">
          Try-on images are AI-generated. <a href="/privacy">How we use your photo</a>
        </p>
      </div>
    </main>
  );
}`;

const NEXT_CSS = `.product {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  max-width: 1100px;
  margin: 48px auto;
  padding: 0 16px;
}

.product img {
  width: 100%;
  border-radius: 12px;
}

.product-tryon {
  --clothsy-accent: #111827;
}`;

export default function Examples() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Guide</p>
      <h1 className="display">Full examples</h1>
      <p className="lede">
        Three complete, copy-paste stores that do everything in the{" "}
        <Link href="/docs/api/custom-store">custom store guide</Link>: upload the shopper&apos;s photo, start the try-on,
        and relay polling to the browser.
      </p>
      <p>
        The Node.js and Python servers expose the same two routes, so the browser code from the guide (
        <code>tryon.js</code>) works with either: <code>POST /tryon</code> with the photo, and{" "}
        <code>GET /tryon/:id</code> to poll. The Next.js example uses the package&apos;s own route and button instead.
      </p>
      <div className="doc-note">
        Photos are uploaded with <code>POST /images</code>, so there&apos;s no bucket to set up and nothing to clean up:
        an uploaded image&apos;s id stops working after 24 hours, and the file is deleted automatically within 35 days.
      </div>

      <h2 id="node">Node.js (Express)</h2>
      <Code title="Terminal" code={NODE_PKG} />
      <Code title=".env" code={NODE_ENV} />
      <Code title="server.mjs" code={NODE} />

      <h2 id="python">Python (Flask)</h2>
      <p>No SDK needed: plain <code>requests</code> calls the HTTP API directly.</p>
      <Code title="Terminal" code={PY_PKG} />
      <Code title="app.py" code={PY} />

      <h2 id="nextjs">Next.js (App Router)</h2>
      <p>
        A product page with a working try-on button, in four files. The walkthrough is in the{" "}
        <Link href="/docs/api/nextjs">Next.js guide</Link>.
      </p>
      <Code title="Terminal" code={NEXT_PKG} />
      <Code title=".env.local" code={NEXT_ENV} />
      <Code title="lib/catalog.ts" code={NEXT_CATALOG} />
      <Code title="app/api/tryon/route.ts" code={NEXT_ROUTE} />
      <Code title="app/products/[id]/page.tsx" code={NEXT_PAGE} />
      <Code title="app/globals.css (add to the end)" code={NEXT_CSS} />
      <p>
        Run <code>npm run dev</code> and open <code>http://localhost:3000/products/denim-jacket</code>. When you deploy to
        Vercel, add <code>CLOTHSY_API_KEY</code> to the project&apos;s environment variables.
      </p>

      <Pager current="/docs/api/examples" />
    </>
  );
}
