import { redirect } from "next/navigation";
import { configured, getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  if (!configured()) {
    return (
      <main className="login-body">
        <div className="login">
          <h1>Not configured</h1>
          <p className="sub">
            Set <code>ADMIN_USERS</code> and <code>ADMIN_SESSION_SECRET</code> before anyone can sign in.
            Generate an account with <code>npm run hash -- you@example.com &apos;a long passphrase&apos;</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-body">
      <LoginForm />
    </main>
  );
}
