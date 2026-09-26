import Link from "next/link";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requirePortalSession } from "@/lib/session";
import { PageHead, Shell } from "@/components/Shell";

export default async function Docs() {
  const session = await requirePortalSession();

  let data;
  try {
    data = await api.me(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/session/expired");
    throw error;
  }

  return (
    <Shell active="/docs" account={data.account}>
      <PageHead title="Documentation" subtitle="How Clothsy AI works on your store, and what happens to a shopper's photo." />

      <div className="grid cols-2">
        <div className="card">
          <div className="card-head"><h2>How a try-on works</h2></div>
          <div className="card-body">
            <ol className="steps">
              <li>A shopper taps <b>Try It On</b> on your product page.</li>
              <li>They upload a photo or take one with their camera.</li>
              <li>Clothsy AI renders them wearing that product, usually in under fifteen seconds.</li>
              <li>They can add to cart, or share the look with a link on our domain.</li>
            </ol>
            <p className="hint">One finished try-on uses one credit. Failed attempts are not charged.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Credits and plans</h2></div>
          <div className="card-body">
            <p className="sub" style={{ marginBottom: 12 }}>
              Each store has a monthly allowance from its plan. It resets every 30 days.
            </p>
            <p className="sub" style={{ marginBottom: 12 }}>
              Need more in a busy month? We agree a top-up, send an invoice, and you pay it under{" "}
              <Link href="/billing">Billing</Link>. Those credits are added to the current cycle and
              are used after your plan&apos;s own allowance.
            </p>
            <p className="hint">Credits bought this way do not carry over when the cycle resets.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Shopper privacy</h2></div>
          <div className="card-body">
            <p className="sub" style={{ marginBottom: 12 }}>
              A shopper&apos;s photo is never stored. It is processed to create the try-on and is not
              written to any database or disk.
            </p>
            <p className="sub" style={{ marginBottom: 12 }}>
              The generated image is not stored either — unless the shopper taps <b>Share Look</b>,
              which creates a page holding one copy so the link keeps working. That copy is deleted
              automatically after 30 days.
            </p>
            <p className="sub">
              A shopper&apos;s own try-on history stays on their device for the visit, and{" "}
              <b>Clear my try-ons</b> removes it and withdraws their consent.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Getting support</h2></div>
          <div className="card-body">
            <p className="sub" style={{ marginBottom: 12 }}>
              Something not rendering the way you expect, or a shopper reporting a problem? Send us
              the product and roughly when it happened — every try-on is logged under{" "}
              <Link href="/generations">Generations</Link> with its outcome, so we can usually find
              it straight away.
            </p>
            <p className="hint">The Playground and a developer API are on the way.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
