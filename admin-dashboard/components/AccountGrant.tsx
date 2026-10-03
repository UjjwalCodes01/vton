"use client";

import { useActionState } from "react";
import { grantAccountCredits } from "@/app/actions";

export function AccountGrant({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState(grantAccountCredits, {});
  return <form action={action} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <input type="hidden" name="accountId" value={accountId} />
    <input className="input" type="number" name="amount" min="1" max="100000" placeholder="Credits" required style={{ width: 110 }} />
    <input className="input" name="reference" minLength={3} maxLength={120} placeholder="Payment reference" title="Payment id, UPI or bank reference, or invoice number. Each reference can be credited once." required style={{ width: 190 }} />
    <input className="input" name="note" maxLength={500} placeholder="Note" style={{ width: 150 }} />
    <button className="btn sm" type="submit" disabled={pending}>Grant</button>
    {state.error ? <span role="alert">{state.error}</span> : null}
    {state.message ? <span role="status">{state.message}</span> : null}
  </form>;
}
