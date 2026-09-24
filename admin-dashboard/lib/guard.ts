import { redirect } from "next/navigation";
import { getSession, type Session } from "./auth";

/** Every dashboard page starts here. No session, no page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
