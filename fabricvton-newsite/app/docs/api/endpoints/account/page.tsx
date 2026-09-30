import type { Metadata } from "next";
import { API_BASE_URL, CONTACT_EMAIL } from "../../../../lib/site";
import { Code, CodeTabs } from "../../../components/Code";
import Pager from "../../../components/Pager";
import { EndpointLine, ErrorTable, FieldTable } from "../../../components/Reference";
import { RES_CREDITS } from "../../../components/samples";

export const metadata: Metadata = {
  title: "Account — Try-on API",
  description: "GET /account: check how many Clothsy AI try-on credits your account has left.",
  alternates: { canonical: "/docs/api/endpoints/account" },
};

const CURL = `curl ${API_BASE_URL}/account \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY"`;

const SDK = `import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads CLOTHSY_API_KEY

const credits = await clothsy.account.credits();
if (credits < 50) {
  console.warn(\`Only \${credits} try-on credits left — time to top up.\`);
}`;

export default function Account() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Endpoints</p>
      <h1 className="display">Account</h1>
      <p className="lede">Check how many credits your account has left.</p>
      <EndpointLine method="GET" path="/account" />
      <p>
        Handy for a health check or a daily alert, so you can top up before shoppers see{" "}
        <code>INSUFFICIENT_CREDITS</code>. It costs nothing to call.
      </p>

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

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          { label: "curl", code: CURL },
          { label: "SDK (TypeScript)", code: SDK },
        ]}
      />

      <h2 id="response">Response</h2>
      <Code title="200 OK" code={RES_CREDITS} />
      <FieldTable
        rows={[
          [
            "credits",
            "number",
            <>
              Credits available right now. Each finished try-on uses one.
            </>,
          ],
        ]}
      />
      <p>
        To buy more credits, <a href={`mailto:${CONTACT_EMAIL}`}>email us</a>.
      </p>

      <h2 id="errors">Errors</h2>
      <ErrorTable
        rows={[
          [401, "INVALID_API_KEY", "The key is missing, malformed or revoked."],
          [500, "INTERNAL_ERROR", "Something went wrong on our side. Retry after a moment."],
          [503, "UNAVAILABLE", "The service is briefly unavailable. Retry after a short wait."],
        ]}
      />

      <Pager current="/docs/api/endpoints/account" />
    </>
  );
}
