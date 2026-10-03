import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL, PLATFORM_URL } from "../../../lib/site";
import { Code, CodeTabs } from "../../components/Code";
import Pager from "../../components/Pager";
import { GARMENT_URL, IMAGE_ID, RES_PENDING, RES_SUCCESS, RES_UPLOADED, TITLE, TRYON_ID } from "../../components/samples";

export const metadata: Metadata = {
  title: "Try-on API — Quickstart",
  description: "Create an API key and run your first Clothsy AI virtual try-on in five minutes, with the SDK, curl or Python.",
  alternates: { canonical: "/docs/api/quickstart" },
};

const INSTALL = {
  sdk: `npm install clothsy-ai`,
  curl: `# Nothing to install — curl is all you need.`,
  python: `pip install requests`,
};

const UPLOAD = {
  sdk: `// tryon.mjs
import { readFile } from "node:fs/promises";
import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

const photo = await clothsy.images.upload(await readFile("shopper.jpg"), {
  filename: "shopper.jpg",
  contentType: "image/jpeg",
});
console.log(photo.id);`,
  curl: `curl -X POST ${API_BASE_URL}/images \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -F "file=@shopper.jpg;type=image/jpeg"`,
  python: `# tryon.py
import os, time, uuid, requests

API = "${API_BASE_URL}"
HEADERS = {"Authorization": f"Bearer {os.environ['CLOTHSY_API_KEY']}"}

with open("shopper.jpg", "rb") as f:
    res = requests.post(
        f"{API}/images",
        headers=HEADERS,
        files={"file": ("shopper.jpg", f, "image/jpeg")},
        timeout=60,
    )
res.raise_for_status()
photo = res.json()
print(photo["id"])`,
};

const RUN = {
  sdk: `// tryon.mjs, continued
const tryon = await clothsy.tryons.run({
  person: { imageId: photo.id },
  garment: { url: "${GARMENT_URL}" },
  title: "${TITLE}",
  consent: true,
});
console.log(tryon.resultUrl);`,
  curl: `curl -X POST ${API_BASE_URL}/tryons/sync \\
  --max-time 75 \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "personImageId": "${IMAGE_ID}",
    "garmentImageUrl": "${GARMENT_URL}",
    "title": "${TITLE}",
    "consent": true
  }'`,
  python: `# tryon.py, continued
res = requests.post(
    f"{API}/tryons/sync",
    headers={**HEADERS, "Idempotency-Key": str(uuid.uuid4())},
    json={
        "personImageId": photo["id"],
        "garmentImageUrl": "${GARMENT_URL}",
        "title": "${TITLE}",
        "consent": True,
    },
    timeout=75,  # the server may hold the request for up to ~45 s
)
tryon = res.json()
if not res.ok:
    raise RuntimeError(f"{tryon['code']}: {tryon['error']}")
print(tryon["status"], tryon.get("resultUrl"))`,
};

const POLL = {
  sdk: `// Nothing to add: run() keeps polling until the try-on is finished.
// If you'd rather start now and collect the result later:
const started = await clothsy.tryons.create({
  person: { imageId: photo.id },
  garment: { url: "${GARMENT_URL}" },
  title: "${TITLE}",
  consent: true,
});
const done = await clothsy.tryons.waitFor(started.id);
console.log(done.resultUrl);`,
  curl: `# Repeat every 2–3 seconds until "status" is "success" or "failed"
curl ${API_BASE_URL}/tryons/${TRYON_ID} \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY"`,
  python: `# tryon.py, continued
deadline = time.time() + 180
while tryon["status"] == "pending" and time.time() < deadline:
    time.sleep(2.5)
    res = requests.get(f"{API}/tryons/{tryon['id']}", headers=HEADERS, timeout=30)
    if res.status_code == 429:
        time.sleep(int(res.headers.get("Retry-After", "5")))
        continue
    res.raise_for_status()
    tryon = res.json()

if tryon["status"] == "success":
    print(tryon["resultUrl"])
else:
    print("Not ready:", tryon["status"], tryon.get("message"))`,
};

function Tabs({ set }: { set: { sdk: string; curl: string; python: string } }) {
  return (
    <CodeTabs
      tabs={[
        { label: "SDK (TypeScript)", code: set.sdk },
        { label: "curl", code: set.curl },
        { label: "Python", code: set.python },
      ]}
    />
  );
}

export default function Quickstart() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Get started</p>
      <h1 className="display">Quickstart</h1>
      <p className="lede">
        Your first try-on in about five minutes: create a key, upload a photo, and get back an image of that person
        wearing a garment.
      </p>
      <p>
        Every step has three versions — the TypeScript SDK, plain curl, and Python. Pick one tab and follow it through.
      </p>

      <h2 id="key">1. Create your API key</h2>
      <ol>
        <li>
          Sign in to the <a href={`${PLATFORM_URL}/login`}>Clothsy AI platform</a> with Google.
        </li>
        <li>
          Open <b>Developer API</b> and click <b>Create API key</b>. Your first key adds 20 free credits to the account.
        </li>
        <li>
          Copy the key straight away — it starts with <code>clothsy_live_</code> and is shown only once. Store it as a
          secret on your server:
        </li>
      </ol>
      <Code title="Terminal" code={`export CLOTHSY_API_KEY="clothsy_live_..."`} />
      <div className="doc-note warn">
        <b>Keep the key on your server.</b> Anyone who has it can spend your credits. Never put it in browser JavaScript,
        a mobile app or a public repository. If it leaks, revoke it in the platform and create a new one.
      </div>

      <h2 id="install">2. Install</h2>
      <Tabs set={INSTALL} />
      <p>
        The SDK needs Node.js 18 or later (or Deno, Bun, or an edge runtime) and has no dependencies. Using Next.js? The{" "}
        <Link href="/docs/api/nextjs">Next.js guide</Link> gets you a working button even faster.
      </p>

      <h2 id="upload">3. Upload the shopper&apos;s photo</h2>
      <p>
        Save a JPEG or PNG under 4 MB as <code>shopper.jpg</code> — a clear, full-length photo of one adult who has agreed
        to it being used. Upload it to get an image id. Uploading is free, and the id works for 24 hours.
      </p>
      <Tabs set={UPLOAD} />
      <Code title="201 Created" code={RES_UPLOADED} />
      <p>
        Already have the photo at a public HTTPS URL? You can skip the upload and send <code>personImageUrl</code> (or{" "}
        <code>{"person: { url }"}</code> in the SDK) instead. <Link href="/docs/api/images">Uploading images</Link>{" "}
        compares the two.
      </p>

      <h2 id="run">4. Create the try-on</h2>
      <p>
        Send the photo&apos;s id, a garment image and <code>consent: true</code>. This uses the sync endpoint, which waits
        for the result — usually well under 30 seconds — and answers with the finished image.
      </p>
      <Tabs set={RUN} />
      <Code title="200 OK" code={RES_SUCCESS} />
      <p>
        The <code>Idempotency-Key</code> makes retries safe: sending the same key again returns the same try-on instead of
        starting — and paying for — a second one. The SDK sets one for you.
      </p>

      <h2 id="poll">5. If it isn&apos;t done yet, poll</h2>
      <p>
        The sync endpoint waits about 45 seconds at most. If the image isn&apos;t ready by then you get <b>202</b> with the
        try-on&apos;s id instead, and you carry on by polling every 2–3 seconds.
      </p>
      <Code title="202 Accepted" code={RES_PENDING} />
      <Tabs set={POLL} />
      <p>
        In a storefront you&apos;ll usually skip the sync endpoint and poll from the start, so your server can answer the
        browser at once. <Link href="/docs/api/custom-store">Add try-on to a custom store</Link> shows that pattern.
      </p>

      <h2 id="show">6. Show it</h2>
      <p>
        <code>resultUrl</code> is a JPEG or PNG image you can put straight into an <code>&lt;img&gt;</code> tag. It works
        for 24 hours; download and store it yourself if you need it for longer. When you show it to shoppers, add a small
        &ldquo;AI-generated try-on&rdquo; caption — <Link href="/docs/api/ai-label">here&apos;s why</Link>.
      </p>
      <p>
        Next: see the whole <Link href="/docs/api/sdk">SDK</Link>, or how the pieces fit into a real storefront in{" "}
        <Link href="/docs/api/custom-store">Add try-on to a custom store</Link>.
      </p>

      <Pager current="/docs/api/quickstart" />
    </>
  );
}
