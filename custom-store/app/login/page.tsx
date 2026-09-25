import Link from "next/link";

/**
 * There is no password here on purpose.
 *
 * A merchant proves who they are by being signed into their own Shopify admin,
 * so this page's whole job is to send them there — and to say so plainly enough
 * that nobody goes hunting for a password they were never given.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; shop?: string }>;
}) {
  const { expired } = await searchParams;

  return (
    <main className="centre">
      <div className="signin">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>Clothsy AI</span>
          <em>billing</em>
        </div>

        {expired ? (
          <p className="notice warn">That sign-in link had expired. Open the portal again from your store admin.</p>
        ) : null}

        <div>
          <h1>Sign in from your store</h1>
          <p className="sub" style={{ marginTop: 8 }}>
            You do not need a password. Open Clothsy AI inside your Shopify admin and it will sign
            you in here automatically.
          </p>
        </div>

        <ol className="steps">
          <li>Open your Shopify admin and go to <b>Apps → Clothsy AI</b>.</li>
          <li>Open the <b>Credits</b> page.</li>
          <li>Click <b>Pay in the billing portal</b>.</li>
        </ol>

        <Link className="btn wide" href="https://admin.shopify.com/" target="_blank" rel="noopener noreferrer">
          Open Shopify admin
        </Link>

        <p className="hint">
          On WooCommerce, or stuck? Reply to the email your invoice came in and we will send you a
          direct link.
        </p>
      </div>
    </main>
  );
}
