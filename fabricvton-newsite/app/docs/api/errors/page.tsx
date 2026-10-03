import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../../lib/site";
import { Code } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "Try-on API — Errors & limits",
  description: "Error codes, rate limits and retry guidance for the Clothsy AI try-on API.",
  alternates: { canonical: "/docs/api/errors" },
};

const ERRORS: [number, string, string, string][] = [
  [400, "MISSING_IDEMPOTENCY_KEY", "No valid Idempotency-Key header.", "Send 8–128 letters, digits, _ or -."],
  [400, "INVALID_IMAGE_URL", "An image URL isn't HTTPS, uses a custom port, or points at a private address.", "Use a public HTTPS URL."],
  [400, "IMAGE_DOWNLOAD_FAILED", "An image URL couldn't be downloaded: not HTTP 200, a redirect, or too slow.", "Check the URL loads the image directly; for signed URLs, check it hasn't expired."],
  [400, "UNSUPPORTED_IMAGE", "An image isn't JPEG or PNG.", "Convert it to JPEG."],
  [400, "INVALID_IMAGE_ID", "An image id is unknown, has expired (older than 24 hours), or was uploaded by another account.", "Upload the image again and use the new id."],
  [401, "INVALID_API_KEY", "The key is missing, malformed or revoked.", "Check the Authorization header."],
  [402, "INSUFFICIENT_CREDITS", "The account has no credits left.", "Top up; hide the try-on button until then."],
  [403, "CONSENT_REQUIRED", "consent wasn't true.", "Collect the shopper's agreement, then send consent: true."],
  [404, "NOT_FOUND", "No try-on with that id on this account, or no endpoint at that path.", "Check the id and the URL against the endpoint pages."],
  [405, "METHOD_NOT_ALLOWED", "The endpoint doesn't accept that HTTP method.", "Check the method, e.g. POST to /tryons, GET to /tryons/{id}."],
  [413, "IMAGE_TOO_LARGE", "An image is larger than 4 MB.", "Resize to about 1600 px before uploading."],
  [422, "PERSON_PHOTO_REJECTED", "The photo needs to show exactly one adult, clearly.", "Ask for a clear photo of just the shopper."],
  [422, "IMAGE_REJECTED", "An image can't be used for a try-on.", "Ask for a different photo."],
  [422, "GARMENT_REJECTED", "This item isn't available for virtual try-on.", "Hide the button for this product."],
  [429, "RATE_LIMITED", "Too many requests.", "Wait the number of seconds in the Retry-After header, then retry."],
  [500, "INTERNAL_ERROR", "Something went wrong on our side.", "Retry with the same Idempotency-Key."],
  [502, "START_FAILED", "The try-on couldn't be started. No credit was used.", "Retry with the same Idempotency-Key."],
  [503, "UNAVAILABLE", "Try-on is temporarily unavailable.", "Retry after a short wait."],
];

export default function Errors() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Guide</p>
      <h1 className="display">Errors &amp; limits</h1>
      <p className="lede">
        Every error is JSON with a human-readable <code>error</code> and a stable <code>code</code>. Write your logic
        against <code>code</code> — the wording of <code>error</code> may improve over time.
      </p>
      <Code
        title="422 Unprocessable Entity"
        code={`{
  "error": "Please use a clear photo of one adult person.",
  "code": "PERSON_PHOTO_REJECTED"
}`}
      />

      <h2 id="codes">Error codes</h2>
      <div className="doc-table">
        <table>
          <thead>
            <tr><th>Status</th><th>Code</th><th>Meaning</th><th>What to do</th></tr>
          </thead>
          <tbody>
            {ERRORS.map(([status, code, meaning, action]) => (
              <tr key={code}>
                <td>{status}</td>
                <td><code>{code}</code></td>
                <td>{meaning}</td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        A try-on can also end with <code>status: &quot;failed&quot;</code> when you poll it — for example if the result
        doesn&apos;t pass our safety checks. That isn&apos;t an HTTP error: the response is 200, <code>message</code> says what
        happened, and the credit has already been returned.
      </p>
      <p>
        Using the <Link href="/docs/api/sdk#errors">TypeScript SDK</Link>? Errors are thrown as typed classes that carry
        the same <code>status</code> and <code>code</code>.
      </p>

      <h2 id="limits">Rate limits</h2>
      <div className="doc-table">
        <table>
          <thead>
            <tr><th>What</th><th>Limit</th></tr>
          </thead>
          <tbody>
            <tr><td>Starting try-ons</td><td>12 a minute per account, shared by <code>POST /tryons</code> and <code>POST /tryons/sync</code></td></tr>
            <tr><td>Polling</td><td>30 a minute per try-on and 600 a minute per account — poll every 2–3 seconds</td></tr>
            <tr><td>Uploading images</td><td>30 a minute per account</td></tr>
            <tr><td>Image size</td><td>4 MB per image, JPEG or PNG</td></tr>
            <tr><td>Uploaded image lifetime</td><td>24 hours from upload; the id can&apos;t be used after that</td></tr>
            <tr><td>Image URL fetch</td><td>HTTPS, default port, HTTP 200 without redirects, within 12 seconds</td></tr>
            <tr><td>Sync wait</td><td>About 45 seconds, then <code>/tryons/sync</code> returns 202 and you poll</td></tr>
            <tr><td>Result URL lifetime</td><td>24 hours</td></tr>
            <tr><td>API keys</td><td>One active key per account</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Over a limit, you get <code>429 RATE_LIMITED</code> with a <code>Retry-After</code> header in seconds. Expecting more
        than 12 try-ons a minute at peak? <a href={`mailto:${CONTACT_EMAIL}`}>Email us</a> and we&apos;ll raise your limit.
      </p>

      <h2 id="retries">Retrying safely</h2>
      <ul>
        <li>
          Retry <code>429</code>, <code>500</code>, <code>502</code> and <code>503</code>, and network timeouts, with the{" "}
          <b>same</b> <code>Idempotency-Key</code>. You can never be charged twice for one key.
        </li>
        <li>
          Don&apos;t retry <code>400</code>, <code>401</code>, <code>402</code>, <code>403</code>, <code>413</code> or{" "}
          <code>422</code> unchanged — fix the request or ask the shopper for another photo first.
        </li>
        <li>Back off between retries: wait 1 second, then 2, then 4, and give up after a few attempts.</li>
        <li>
          For <code>/tryons/sync</code>, set your client timeout to at least 70 seconds. If the connection drops anyway,
          repeat the request with the same <code>Idempotency-Key</code> to pick the try-on back up.
        </li>
        <li>
          The <Link href="/docs/api/sdk#retries">SDK</Link> does all of this for you: it retries network errors, 429, 500,
          502 and 503 with backoff, honours <code>Retry-After</code>, and keeps the same key.
        </li>
      </ul>

      <h2 id="credits">Credits</h2>
      <ul>
        <li>One credit per finished try-on. Failed try-ons are refunded automatically.</li>
        <li>Your first API key adds 20 free credits to the account, once.</li>
        <li>
          API try-ons use your account&apos;s credits. They don&apos;t use the monthly allowance of any Shopify or WooCommerce
          store you have connected.
        </li>
        <li>
          Need more? <a href={`mailto:${CONTACT_EMAIL}`}>Email us</a> to buy credits.
        </li>
      </ul>

      <Pager current="/docs/api/errors" />
    </>
  );
}
