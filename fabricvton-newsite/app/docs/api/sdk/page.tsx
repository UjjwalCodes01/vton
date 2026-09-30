import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../lib/site";
import { Code, CodeTabs } from "../../components/Code";
import Pager from "../../components/Pager";
import { FieldTable } from "../../components/Reference";
import { GARMENT_URL, TITLE, TRYON_ID } from "../../components/samples";

export const metadata: Metadata = {
  title: "TypeScript SDK — Try-on API",
  description:
    "Reference for clothsy-ai, the zero-dependency TypeScript SDK for the Clothsy AI try-on API: uploads, try-ons, waiting, retries and typed errors.",
  alternates: { canonical: "/docs/api/sdk" },
};

const INSTALL = `npm install clothsy-ai`;

const SETUP = `import { Clothsy } from "clothsy-ai";

// Reads the key from process.env.CLOTHSY_API_KEY.
const clothsy = new Clothsy();

// Or configure it explicitly:
const custom = new Clothsy({
  apiKey: process.env.CLOTHSY_API_KEY,
  timeoutMs: 60_000,
  maxRetries: 2,
});`;

const WORKERS = `import { Clothsy } from "clothsy-ai";

export default {
  async fetch(request, env) {
    // Workers have no process.env, so pass the secret in.
    const clothsy = new Clothsy({ apiKey: env.CLOTHSY_API_KEY });
    const credits = await clothsy.account.credits();
    return Response.json({ credits });
  },
};`;

const DENO = `import { Clothsy } from "npm:clothsy-ai";

const clothsy = new Clothsy({ apiKey: Deno.env.get("CLOTHSY_API_KEY") });`;

const UPLOAD = `import { readFile } from "node:fs/promises";

// From a file on disk (a Node.js Buffer is a Uint8Array):
const photo = await clothsy.images.upload(await readFile("shopper.jpg"), {
  filename: "shopper.jpg",
  contentType: "image/jpeg",
});

// From a form upload in a route handler (a File is a Blob):
const form = await request.formData();
const fromForm = await clothsy.images.upload(form.get("photo") as File);

console.log(photo.id, photo.expiresAt);`;

const CREATE = `const tryon = await clothsy.tryons.create({
  person: { imageId: photo.id },          // or { url: "https://…" }
  garment: { url: "${GARMENT_URL}" },     // or { imageId: "img_…" }
  title: "${TITLE}",
  consent: true,
  idempotencyKey: requestId,              // optional
});

tryon.id;      // "${TRYON_ID}"
tryon.status;  // "pending"`;

const RETRIEVE = `const tryon = await clothsy.tryons.retrieve("${TRYON_ID}");

if (tryon.status === "success") show(tryon.resultUrl);
if (tryon.status === "failed") console.log(tryon.message);`;

const WAIT = `const controller = new AbortController();

const done = await clothsy.tryons.waitFor(tryon.id, {
  timeoutMs: 120_000,          // default 180_000
  intervalMs: 3_000,           // default 2_500
  signal: controller.signal,   // call controller.abort() to stop waiting
});

console.log(done.resultUrl);`;

const RUN = `const done = await clothsy.tryons.run(
  {
    person: { imageId: photo.id },
    garment: { url: "${GARMENT_URL}" },
    title: "${TITLE}",
    consent: true,
  },
  { timeoutMs: 120_000 },   // optional, same options as waitFor
);

console.log(done.resultUrl);`;

const CREDITS = `const credits = await clothsy.account.credits(); // e.g. 42`;

const ERRORS = `import {
  Clothsy,
  ClothsyError,
  InsufficientCreditsError,
  RateLimitError,
  TryOnFailedError,
  TryOnTimeoutError,
  ValidationError,
  friendlyMessage,
} from "clothsy-ai";

const clothsy = new Clothsy();

export async function tryOn(params) {
  try {
    const done = await clothsy.tryons.run(params);
    return { resultUrl: done.resultUrl };
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await alertTheTeam("Try-on credits are used up");
    } else if (error instanceof RateLimitError) {
      console.warn(\`Rate limited; retry in \${error.retryAfter} s\`);
    } else if (error instanceof ValidationError) {
      console.info("Request refused:", error.code);   // e.g. PERSON_PHOTO_REJECTED
    } else if (error instanceof TryOnFailedError || error instanceof TryOnTimeoutError) {
      console.info(error.message);
    } else if (error instanceof ClothsyError) {
      console.error(error.status, error.code, error.message);
    } else {
      throw error;
    }
    // Safe, friendly wording for the shopper, whatever went wrong:
    return { message: friendlyMessage(error) };
  }
}`;

export default function SdkReference() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Get started</p>
      <h1 className="display">TypeScript SDK</h1>
      <p className="lede">
        <code>clothsy-ai</code> wraps the HTTP API in a few typed methods, and takes care of idempotency keys, retries and
        waiting for results so you don&apos;t have to.
      </p>

      <h2 id="install">Install</h2>
      <Code title="Terminal" code={INSTALL} />
      <ul>
        <li>
          <b>Runs on</b> Node.js 18+, Deno, Bun, Vercel Edge and Cloudflare Workers — anywhere with a standard{" "}
          <code>fetch</code>.
        </li>
        <li>
          <b>No dependencies.</b> Nothing else is installed with it.
        </li>
        <li>
          <b>Server only.</b> Creating a client in a browser throws an error, because your API key would be visible to
          anyone. There is a <code>dangerouslyAllowBrowser</code> option for special cases such as internal tools on a
          trusted network — don&apos;t use it on a public site.
        </li>
      </ul>
      <p>
        Building with Next.js? The same package includes a ready-made route handler and React button — see{" "}
        <Link href="/docs/api/nextjs">Next.js</Link>.
      </p>

      <h2 id="client">Create a client</h2>
      <Code title="server.ts" code={SETUP} />
      <FieldTable
        head="Option"
        rows={[
          [
            "apiKey",
            "string",
            <>
              Your key. Defaults to <code>process.env.CLOTHSY_API_KEY</code>.
            </>,
          ],
          [
            "baseUrl",
            "string",
            <>
              Defaults to <code>{API_BASE_URL}</code>. You won&apos;t normally change it.
            </>,
          ],
          ["timeoutMs", "number", <>How long each HTTP request may take before it&apos;s abandoned. Default 60_000.</>],
          [
            "maxRetries",
            "number",
            <>
              How many times to retry a request that failed for a temporary reason. Default 2. See{" "}
              <a href="#retries">Retries</a>.
            </>,
          ],
          [
            "fetch",
            "function",
            <>
              A <code>fetch</code> implementation to use instead of the global one — useful for tests, proxies or
              instrumentation.
            </>,
          ],
          [
            "dangerouslyAllowBrowser",
            "boolean",
            <>Allows creating a client in a browser. Default false. Your key would be public — avoid it.</>,
          ],
        ]}
      />
      <p>
        Where there&apos;s no <code>process.env</code>, pass the key in yourself:
      </p>
      <CodeTabs
        tabs={[
          { label: "Cloudflare Workers", code: WORKERS },
          { label: "Deno", code: DENO },
        ]}
      />

      <h2 id="images-upload">images.upload(data, options?)</h2>
      <p>
        Uploads a JPEG or PNG (up to 4 MB) with <Link href="/docs/api/endpoints/upload-image">POST /images</Link> and
        resolves with <code>{"{ id, expiresAt }"}</code>. The id works in any number of try-ons for 24 hours. Uploading is
        free.
      </p>
      <Code title="upload.ts" code={UPLOAD} />
      <FieldTable
        head="Argument"
        rows={[
          [
            "data",
            "Blob | bytes",
            <>
              The image: a <code>Blob</code> or <code>File</code>, or raw bytes such as a <code>Uint8Array</code> or Node.js{" "}
              <code>Buffer</code>.
            </>,
          ],
          ["options.filename", "string", <>A file name to send with the upload.</>],
          [
            "options.contentType",
            "string",
            <>
              <code>image/jpeg</code> or <code>image/png</code>. Worth setting when you pass raw bytes, which carry no type
              of their own.
            </>,
          ],
        ]}
      />

      <h2 id="tryons-create">tryons.create(params)</h2>
      <p>
        Starts a try-on with <Link href="/docs/api/endpoints/create-try-on">POST /tryons</Link> and resolves straight away
        with <code>{'{ id, status: "pending", pollUrl }'}</code>.
      </p>
      <Code title="create.ts" code={CREATE} />
      <FieldTable
        head="Param"
        rows={[
          [
            "person",
            "{ url } | { imageId }",
            <>The photo of the shopper: an HTTPS URL, or the id of an uploaded image.</>,
          ],
          ["garment", "{ url } | { imageId }", <>The product image, in either form.</>],
          ["title", "string, optional", <>The product&apos;s name, up to 120 characters. Improves garment placement.</>],
          [
            "consent",
            "true",
            <>Required. Confirms the person is an adult who agreed, and that you have the rights to both images.</>,
          ],
          [
            "idempotencyKey",
            "string, optional",
            <>
              8–128 letters, digits, <code>_</code> or <code>-</code>. Generated for you if you leave it out. Pass your own
              when your code might call <code>create</code> twice for the same thing — for example, one key per shopper
              click.
            </>,
          ],
        ]}
      />

      <h2 id="tryons-retrieve">tryons.retrieve(id)</h2>
      <p>
        One check with <Link href="/docs/api/endpoints/get-try-on">GET /tryons/{"{id}"}</Link>. Resolves with{" "}
        <code>{"{ id, status, resultUrl, message? }"}</code>, where <code>status</code> is <code>pending</code>,{" "}
        <code>success</code> or <code>failed</code>. A failed try-on is returned, not thrown.
      </p>
      <Code title="retrieve.ts" code={RETRIEVE} />

      <h2 id="tryons-wait-for">tryons.waitFor(id, options?)</h2>
      <p>
        Polls until the try-on is finished and resolves with it once <code>status</code> is <code>success</code>. If the
        try-on fails it throws <code>TryOnFailedError</code>; if it&apos;s still pending when time runs out it throws{" "}
        <code>TryOnTimeoutError</code>. A timeout only means you stopped waiting — the try-on may still finish, and you
        can call <code>waitFor</code> again with the same id.
      </p>
      <Code title="wait.ts" code={WAIT} />
      <FieldTable
        head="Option"
        rows={[
          ["timeoutMs", "number", <>How long to keep waiting. Default 180_000 (3 minutes).</>],
          ["intervalMs", "number", <>Time between checks. Default 2_500.</>],
          [
            "signal",
            "AbortSignal",
            <>Stops waiting when aborted — for example, when the shopper closes the page.</>,
          ],
          ["onStatus", "function", <>Called with the latest try-on object (<code>{"{ id, status, resultUrl, message }"}</code>) each time the SDK checks on it, so you can report progress.</>],
        ]}
      />

      <h2 id="tryons-run">tryons.run(params, waitOptions?)</h2>
      <p>
        Create and wait in one call. It uses{" "}
        <Link href="/docs/api/endpoints/create-try-on-sync">POST /tryons/sync</Link>, which usually returns the finished
        image directly, and falls back to polling if it needs more time. It resolves with the finished try-on and throws
        the same errors as <code>waitFor</code>. Takes the same <code>params</code> as <code>create</code> and the same
        options as <code>waitFor</code>.
      </p>
      <Code title="run.ts" code={RUN} />
      <div className="doc-note">
        <b>Which one should I use?</b> <code>run()</code> is the simplest choice for scripts, jobs and any server code that
        can wait. Behind a storefront, where you want to answer the browser quickly, call <code>create()</code> and let the
        browser poll your server, which calls <code>retrieve()</code>.
      </div>

      <h2 id="account-credits">account.credits()</h2>
      <p>
        Resolves with the number of credits left on the account, from{" "}
        <Link href="/docs/api/endpoints/account">GET /account</Link>.
      </p>
      <Code title="credits.ts" code={CREDITS} />

      <h2 id="retries">Idempotency and retries</h2>
      <ul>
        <li>
          Every <code>create()</code> and <code>run()</code> sends an <code>Idempotency-Key</code>. If you don&apos;t pass
          one, the SDK makes one and reuses it for its own retries, so a retry can never start — or charge for — a second
          try-on.
        </li>
        <li>
          Network errors and responses with status 429, 500, 502 or 503 are retried up to <code>maxRetries</code> times,
          waiting 1 s, then 2 s, then 4 s. When the API sends <code>Retry-After</code>, the SDK waits that long instead.
        </li>
        <li>
          Other errors — a bad image, missing consent, no credits — are thrown at once, because retrying them unchanged
          won&apos;t help.
        </li>
        <li>
          Set <code>maxRetries: 0</code> to turn retries off.
        </li>
      </ul>

      <h2 id="errors">Errors</h2>
      <p>
        Everything the SDK throws for an API problem is a <code>ClothsyError</code>, with the HTTP <code>status</code>, the
        API&apos;s <code>code</code> and a <code>message</code>. More specific subclasses let you branch with{" "}
        <code>instanceof</code>:
      </p>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Thrown when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>AuthenticationError</code>
              </td>
              <td>
                The key is missing, malformed or revoked (<code>INVALID_API_KEY</code>).
              </td>
            </tr>
            <tr>
              <td>
                <code>InsufficientCreditsError</code>
              </td>
              <td>
                The account is out of credits (<code>INSUFFICIENT_CREDITS</code>).
              </td>
            </tr>
            <tr>
              <td>
                <code>ValidationError</code>
              </td>
              <td>
                The request or one of its images was refused. Check <code>error.code</code> for the reason, such as{" "}
                <code>INVALID_IMAGE_URL</code> or <code>PERSON_PHOTO_REJECTED</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>RateLimitError</code>
              </td>
              <td>
                Still rate limited after the retries. <code>retryAfter</code> says how many seconds to wait.
              </td>
            </tr>
            <tr>
              <td>
                <code>ServerError</code>
              </td>
              <td>A 5xx response that didn&apos;t clear up after the retries.</td>
            </tr>
            <tr>
              <td>
                <code>ConnectionError</code>
              </td>
              <td>The API couldn&apos;t be reached, or a request took longer than <code>timeoutMs</code>.</td>
            </tr>
            <tr>
              <td>
                <code>TryOnFailedError</code>
              </td>
              <td>
                From <code>waitFor()</code> or <code>run()</code>: the try-on finished with <code>failed</code>. Its credit
                has been returned.
              </td>
            </tr>
            <tr>
              <td>
                <code>TryOnTimeoutError</code>
              </td>
              <td>
                From <code>waitFor()</code> or <code>run()</code>: still pending when <code>timeoutMs</code> ran out.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>friendlyMessage(error)</code> turns any of these into a short sentence that&apos;s safe to show a shopper,
        without exposing codes or internals.
      </p>
      <Code title="errors.ts" code={ERRORS} />
      <p>
        The full list of API codes is in <Link href="/docs/api/errors">Errors &amp; limits</Link>.
      </p>

      <Pager current="/docs/api/sdk" />
    </>
  );
}
