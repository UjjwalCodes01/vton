import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL, API_ORIGIN, CONTACT_EMAIL } from "../../../../lib/site";
import { Code, CodeTabs } from "../../../components/Code";
import Pager from "../../../components/Pager";
import { EndpointLine, ErrorTable, FieldTable } from "../../../components/Reference";
import { GARMENT_URL, IMAGE_ID, RES_PENDING, TITLE } from "../../../components/samples";
import { TRYON_ERRORS, TryOnBody, TryOnHeaders } from "../../../components/TryOnRequest";

export const metadata: Metadata = {
  title: "Create try-on — Try-on API",
  description:
    "POST /tryons: start a Clothsy AI virtual try-on from a person photo and a garment image, then poll for the result.",
  alternates: { canonical: "/docs/api/endpoints/create-try-on" },
};

const CURL = `curl -X POST ${API_BASE_URL}/tryons \\
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

const tryon = await clothsy.tryons.create({
  person: { imageId: "${IMAGE_ID}" },
  garment: { url: "${GARMENT_URL}" },
  title: "${TITLE}",
  consent: true,
});

console.log(tryon.id); // poll this, or: await clothsy.tryons.waitFor(tryon.id)`;

export default function CreateTryOn() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Endpoints</p>
      <h1 className="display">Create try-on</h1>
      <p className="lede">
        Start a try-on from a photo of a person and an image of a garment. The call returns straight away with an id; the
        image is made in the background and you <Link href="/docs/api/endpoints/get-try-on">poll</Link> for it.
      </p>
      <EndpointLine method="POST" path="/tryons" />
      <p>
        This is the endpoint to use behind a storefront: your server answers the shopper&apos;s browser immediately and can
        show progress while it polls. If you&apos;d rather make one blocking call, see{" "}
        <Link href="/docs/api/endpoints/create-try-on-sync">Create try-on (sync)</Link>.
      </p>

      <h2 id="headers">Headers</h2>
      <TryOnHeaders />

      <h2 id="body">Body</h2>
      <TryOnBody />

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          { label: "curl", code: CURL },
          { label: "SDK (TypeScript)", code: SDK },
        ]}
      />
      <p>
        The SDK creates an <code>Idempotency-Key</code> for you and reuses it if it has to retry. Pass{" "}
        <code>idempotencyKey</code> yourself when your own code might repeat the call — for example, one key per shopper
        click.
      </p>

      <h2 id="response">Response</h2>
      <Code title="202 Accepted" code={RES_PENDING} />
      <FieldTable
        rows={[
          ["id", "string", <>The try-on&apos;s id. Keep it to poll.</>],
          [
            "status",
            "string",
            <>
              Always <code>pending</code> here.
            </>,
          ],
          [
            "pollUrl",
            "string",
            <>
              Where to poll, relative to <code>{API_ORIGIN}</code>. It&apos;s the same as{" "}
              <code>GET /tryons/{"{id}"}</code>.
            </>,
          ],
        ]}
      />

      <h3 id="credits">Credits</h3>
      <p>
        A finished try-on costs 1 credit. If it fails, or can&apos;t be started, the credit comes back automatically — you
        only pay for results. Sending the same <code>Idempotency-Key</code> again returns the original try-on and never
        charges twice.
      </p>

      <h3 id="limits">Rate limit</h3>
      <p>
        Each account can start 12 try-ons a minute. Need more at peak times?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>Email us</a> and we&apos;ll raise it.
      </p>

      <h2 id="errors">Errors</h2>
      <ErrorTable rows={TRYON_ERRORS} />
      <p>
        Some problems only show up once the image is being made. Those don&apos;t arrive as HTTP errors here: the try-on
        ends with <code>status: &quot;failed&quot;</code> when you poll it, and the credit is returned. See{" "}
        <Link href="/docs/api/errors">Errors &amp; limits</Link> for retry advice.
      </p>

      <Pager current="/docs/api/endpoints/create-try-on" />
    </>
  );
}
