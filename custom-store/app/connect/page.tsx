import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { setPortalSession } from "@/lib/session";

/**
 * Where a merchant lands when they click through from their Shopify admin.
 *
 * The one-time token in the URL is swapped for a session server-side and then
 * dropped: the redirect leaves nothing sensitive in history or in a referrer.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  try {
    const { session } = await api.exchange(token);
    await setPortalSession(session);
  } catch {
    // Either the token aged out (they are short-lived on purpose) or it was
    // never ours. Both look the same from here, and should.
    redirect("/login?error=expired");
  }

  redirect("/");
}
