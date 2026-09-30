import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { ApiKeys } from "@/components/ApiKeys";
import { PageHead, Shell } from "@/components/Shell";

export default async function KeysPage() {
  const session = await requirePortalSession();
  let account, keys;
  try { [account, keys] = await Promise.all([api.me(session), api.keys(session)]); }
  catch (error) { if (error instanceof ApiError && error.status === 401) redirect("/session/expired"); throw error; }
  return <Shell active="/api-keys" account={account.account}>
    <PageHead title="Developer API" subtitle="Create your key and use Clothsy try-on from your own backend." />
    <ApiKeys initial={keys} />
    <div className="card" style={{ marginTop: 16 }}><div className="card-head"><h2>Quickstart</h2></div><div className="card-body">
      <p className="sub">Send the key only from your server. Both image URLs must be public HTTPS URLs or short-lived signed HTTPS URLs. Confirm adult consent and permission for the photos before calling.</p>
      <pre className="mono" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`curl -X POST https://fabricvton-api.onrender.com/api/v1/tryons \\
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \\
  -H "Idempotency-Key: unique-order-or-request-id" \\
  -H "Content-Type: application/json" \\
  -d '{"personImageUrl":"https://example.com/person.jpg","garmentImageUrl":"https://example.com/dress.jpg","title":"Cotton dress","consent":true}'`}</pre>
      <p className="sub">Poll the returned <code>pollUrl</code> using the same bearer key. A successful result includes a short-lived <code>resultUrl</code> on Clothsy&apos;s domain.</p>
      <p className="sub" style={{ marginTop: 12 }}>
        Full documentation — including a step-by-step guide for custom stores and complete Node.js and Python
        examples — is at{" "}
        <a href="https://clothsyai.fabricvton.com/docs/api" target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet)", textDecoration: "underline" }}>
          clothsyai.fabricvton.com/docs/api
        </a>
        .
      </p>
    </div></div>
  </Shell>;
}
