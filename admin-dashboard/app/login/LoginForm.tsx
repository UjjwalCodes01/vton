"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type ActionState } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn accent wide" type="submit" disabled={pending}>
      {pending ? "Checking…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form className="login" action={formAction}>
      <div className="brand">
        <span className="brand-mark">C</span>
        <b>Clothsy AI</b>
        <em>admin</em>
      </div>
      <h1>Sign in</h1>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <label>
        Email
        <input className="input" type="email" name="email" autoComplete="username" required autoFocus />
      </label>
      <label>
        Password
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>
      <Submit />
      <p className="hint">
        This dashboard can change every store&apos;s plan and delete their data. Access is limited to listed accounts.
      </p>
    </form>
  );
}
