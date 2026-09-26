import { redirect } from "next/navigation";
import { googleSignInUrl } from "@/lib/api";
import { getPortalSession } from "@/lib/session";

const MESSAGES: Record<string, string> = {
  expired: "Your session ended. Sign in again.",
  cancelled: "That sign-in was cancelled.",
  bad_state: "That sign-in could not be verified. Please try again.",
  google_failed: "Google could not complete the sign-in. Please try again.",
  google_unavailable: "Google sign-in is not set up yet. Open the portal from your Shopify admin instead.",
  unavailable: "We could not reach Clothsy AI just then. Try again in a moment.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; expired?: string }>;
}) {
  if (await getPortalSession()) redirect("/");

  const { error, expired } = await searchParams;
  const message = MESSAGES[error || (expired ? "expired" : "")] || "";

  return (
    <main className="centre">
      <div className="signin">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/icon.png" alt="" width={28} height={28} />
          <span className="brand-text">
            <b>Clothsy AI</b>
            <em>platform</em>
          </span>
        </div>

        <div>
          <h1 className="display">Sign in</h1>
          <p className="sub" style={{ marginTop: 8 }}>
            Manage your try-on credits, generations and billing in one place.
          </p>
        </div>

        {message ? <p className="notice bad" style={{ margin: 0 }}>{message}</p> : null}

        <a className="google" href={googleSignInUrl}>
          <GoogleMark />
          Continue with Google
        </a>

        <div className="divider">or from your store</div>

        <ol className="steps">
          <li>Open your Shopify admin and go to <b>Apps → Clothsy AI</b>.</li>
          <li>Open the <b>Credits</b> page.</li>
          <li>Click <b>Open the billing portal</b>.</li>
        </ol>

        <p className="hint">
          Arriving from your store signs you in without a password. On WooCommerce, reply to your
          invoice email and we will send you a direct link.
        </p>
      </div>
    </main>
  );
}
