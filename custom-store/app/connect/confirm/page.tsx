import { redirect } from "next/navigation";
import { peekHandoff } from "@/lib/handoff";

export const metadata = { robots: { index: false, follow: false } };

/**
 * One click between the Shopify admin and a signed-in portal.
 *
 * Names the store the link is for, so a link sent by somebody else is obvious
 * for what it is. The form posts back to /connect, which accepts it only from
 * this site.
 */
export default async function ConfirmConnect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const { subject } = peekHandoff(token);
  const store = subject && !subject.startsWith("account:") ? subject : null;

  return (
    <main className="centre">
      <form className="signin" method="post" action="/connect">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/icon.png" alt="" width={28} height={28} />
          <span className="brand-text">
            <b>Clothsy AI</b>
            <em>platform</em>
          </span>
        </div>
        <div>
          <h1 className="display">Continue to your platform</h1>
          <p className="sub" style={{ marginTop: 8 }}>
            {store ? (
              <>
                You are signing in to manage <b className="mono">{store}</b>. If you did not just
                open this from that store&apos;s Shopify admin, close this page.
              </>
            ) : (
              <>If you did not just ask to sign in, close this page.</>
            )}
          </p>
        </div>
        <input type="hidden" name="token" value={token} />
        <button className="btn violet wide" type="submit">Continue</button>
      </form>
    </main>
  );
}
