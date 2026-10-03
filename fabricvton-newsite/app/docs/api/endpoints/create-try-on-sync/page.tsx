import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../../lib/site";
import { Code, CodeTabs } from "../../../components/Code";
import Pager from "../../../components/Pager";
import { EndpointLine, ErrorTable, FieldTable } from "../../../components/Reference";
import { GARMENT_URL, IMAGE_ID, RES_FAILED, RES_PENDING, RES_SUCCESS, TITLE } from "../../../components/samples";
import { TRYON_ERRORS, TryOnBody, TryOnHeaders } from "../../../components/TryOnRequest";

export const metadata: Metadata = {
  title: "Create try-on (sync) — Try-on API",
  description:
    "POST /tryons/sync: start a Clothsy AI try-on and wait for the result in the same request, for scripts and back-office tools.",
  alternates: { canonical: "/docs/api/endpoints/create-try-on-sync" },
};

const CURL = `curl -X POST ${API_BASE_URL}/tryons/sync \\
  --max-time 75 \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "personImageId": "${IMAGE_ID}",
    "garmentImageUrl": "${GARMENT_URL}",
    "title": "${TITLE}",
    "consent": true
  }'`;

const SDK = `import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

// run() calls /tryons/sync and, if the try-on isn't done yet, keeps polling.
const tryon = await clothsy.tryons.run({
  person: { imageId: "${IMAGE_ID}" },
  garment: { url: "${GARMENT_URL}" },
  title: "${TITLE}",
  consent: true,
});

console.log(tryon.resultUrl);`;

export default function CreateTryOnSync() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Endpoints</p>
      <h1 className="display">Create try-on (sync)</h1>
      <p className="lede">
        The same as <Link href="/docs/api/endpoints/create-try-on">Create try-on</Link>, except the server holds the
        request open until the image is ready — up to about 45 seconds — so most of the time one call is all you need.
      </p>
      <EndpointLine method="POST" path="/tryons/sync" />

      <div className="doc-note">
        <b>Good for scripts, batch jobs and back-office tools.</b> In a storefront, prefer{" "}
        <Link href="/docs/api/endpoints/create-try-on">Create try-on</Link> and polling: a request that hangs for most of a
        minute is easy to lose to a proxy or platform timeout, and polling lets you show the shopper progress.
      </div>

      <h2 id="request">Request</h2>
      <p>Headers and body are exactly the same as for Create try-on, including the Idempotency-Key.</p>
      <h3 id="headers">Headers</h3>
      <TryOnHeaders />
      <h3 id="body">Body</h3>
      <TryOnBody />

      <h2 id="timeout">Set a long enough timeout</h2>
      <p>
        Give your HTTP client a timeout of <b>at least 70 seconds</b>. Many clients default to 30 seconds, which would cut
        the connection while the image is still being made. If your connection drops anyway, nothing is lost: the try-on
        carries on, and repeating the request with the same <code>Idempotency-Key</code> picks it back up without a
        second charge.
      </p>

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          { label: "curl", code: CURL },
          { label: "SDK (TypeScript)", code: SDK },
        ]}
      />

      <h2 id="response">Response</h2>
      <p>
        When the try-on finishes within the wait, you get <b>200</b> with its final state — the same shape as{" "}
        <Link href="/docs/api/endpoints/get-try-on">Get try-on</Link>:
      </p>
      <Code title="200 OK — finished" code={RES_SUCCESS} />
      <Code title="200 OK — failed" code={RES_FAILED} />
      <FieldTable
        rows={[
          ["id", "string", <>The try-on&apos;s id.</>],
          [
            "status",
            "string",
            <>
              <code>success</code> or <code>failed</code>.
            </>,
          ],
          [
            "resultUrl",
            "string | null",
            <>On success, the finished image. Public, needs no key, and works for 24 hours.</>,
          ],
          ["message", "string", <>On failure, a short explanation. The credit has already been returned.</>],
        ]}
      />
      <p>
        If it isn&apos;t finished when the wait runs out, you get <b>202</b> instead — exactly what Create try-on returns.
        Carry on by polling <code>pollUrl</code> every 2–3 seconds.
      </p>
      <Code title="202 Accepted — still working" code={RES_PENDING} />
      <p>
        So always handle both: check the HTTP status, and treat 202 as &ldquo;poll from here&rdquo;. The SDK&apos;s{" "}
        <code>tryons.run()</code> does this for you.
      </p>

      <h2 id="errors">Errors</h2>
      <p>The same as Create try-on, with the same rate limit of 12 starts a minute per account.</p>
      <ErrorTable rows={TRYON_ERRORS} />

      <Pager current="/docs/api/endpoints/create-try-on-sync" />
    </>
  );
}
