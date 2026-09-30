import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../../../lib/site";
import { Code, CodeTabs } from "../../../components/Code";
import Pager from "../../../components/Pager";
import { EndpointLine, ErrorTable, FieldTable } from "../../../components/Reference";
import { RES_FAILED, RES_SUCCESS, TRYON_ID } from "../../../components/samples";

export const metadata: Metadata = {
  title: "Get try-on — Try-on API",
  description: "GET /tryons/{id}: read the status of a Clothsy AI try-on and get the result image URL when it's ready.",
  alternates: { canonical: "/docs/api/endpoints/get-try-on" },
};

const CURL = `curl ${API_BASE_URL}/tryons/${TRYON_ID} \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY"`;

const SDK = `import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

// One check:
const tryon = await clothsy.tryons.retrieve("${TRYON_ID}");
console.log(tryon.status);

// Or let the SDK poll until it's done (every 2.5 s, for up to 3 minutes):
const finished = await clothsy.tryons.waitFor("${TRYON_ID}");
console.log(finished.resultUrl);`;

export default function GetTryOn() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Endpoints</p>
      <h1 className="display">Get try-on</h1>
      <p className="lede">
        Read a try-on&apos;s current state. Call it every 2–3 seconds after you create one, until the status is{" "}
        <code>success</code> or <code>failed</code>.
      </p>
      <EndpointLine method="GET" path="/tryons/{id}" />

      <h2 id="headers">Headers</h2>
      <FieldTable
        head="Header"
        rows={[
          [
            "Authorization",
            "required",
            <>
              <code>Bearer</code> followed by your API key.
            </>,
          ],
        ]}
      />

      <h2 id="params">Path parameters</h2>
      <FieldTable
        head="Parameter"
        rows={[
          [
            "id",
            "string",
            <>
              The <code>id</code> returned when you created the try-on. Only try-ons made by your account can be read.
            </>,
          ],
        ]}
      />

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          { label: "curl", code: CURL },
          { label: "SDK (TypeScript)", code: SDK },
        ]}
      />

      <h2 id="response">Response</h2>
      <FieldTable
        rows={[
          ["id", "string", <>The try-on&apos;s id.</>],
          [
            "status",
            "string",
            <>
              <code>pending</code> while the image is being made, then <code>success</code> or <code>failed</code>.
            </>,
          ],
          [
            "resultUrl",
            "string | null",
            <>
              On <code>success</code>, the finished image as a JPEG or PNG. Anyone with the URL can load it — no key needed
              — so a shopper&apos;s browser can show it directly. It works for 24 hours; copy the image to your own storage
              if you need it for longer. <code>null</code> otherwise.
            </>,
          ],
          [
            "message",
            "string, optional",
            <>
              On <code>failed</code>, a short explanation you can show. The credit has already been returned.
            </>,
          ],
        ]}
      />
      <Code title="200 OK — finished" code={RES_SUCCESS} />
      <Code title="200 OK — failed" code={RES_FAILED} />
      <p>
        A failed try-on is still a <b>200</b> response: the request to read it worked, the try-on itself didn&apos;t. Check{" "}
        <code>status</code>, not just the HTTP code.
      </p>
      <p>
        Every result image carries a machine-readable label saying it was made with AI. Read{" "}
        <Link href="/docs/api/ai-label">AI content label</Link> for what that means for how you display it.
      </p>

      <h2 id="polling">Polling tips</h2>
      <ul>
        <li>Wait 2–3 seconds between checks. Most try-ons are ready in under 30 seconds.</li>
        <li>
          Each account can make 60 of these requests a minute. That covers a couple of try-ons in progress at once; with
          more in flight, slow down or you&apos;ll get <code>429 RATE_LIMITED</code>.
        </li>
        <li>Give up after a few minutes and tell the shopper to try again, rather than polling forever.</li>
      </ul>

      <h2 id="errors">Errors</h2>
      <ErrorTable
        rows={[
          [401, "INVALID_API_KEY", "The key is missing, malformed or revoked."],
          [404, "NOT_FOUND", "No try-on with that id belongs to this account."],
          [429, "RATE_LIMITED", "More than 60 polls in a minute. Wait for the Retry-After header."],
          [500, "INTERNAL_ERROR", "Something went wrong on our side. Retry after a moment."],
          [503, "UNAVAILABLE", "The service is briefly unavailable. Retry after a short wait."],
        ]}
      />

      <Pager current="/docs/api/endpoints/get-try-on" />
    </>
  );
}
