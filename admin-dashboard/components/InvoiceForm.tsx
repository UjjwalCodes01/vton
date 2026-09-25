"use client";

// Drafting a credit sale.
//
// Amount and credits are deliberately independent fields: these are negotiated
// deals, so nothing here multiplies one by a price list. The summary line under
// the form restates what is about to happen in plain words, because the mistake
// worth preventing is sending ₹29,000 for 100 credits instead of 10,000.

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { invoiceAction, type ActionState } from "@/app/actions";

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

function Submit({ draft }: { draft: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn ${draft ? "ghost" : "accent"}`} type="submit" disabled={pending}>
      {pending ? "Working…" : draft ? "Save as draft" : "Send invoice"}
    </button>
  );
}

export function InvoiceForm({ shop }: { shop: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(invoiceAction, {});
  const [credits, setCredits] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [draft, setDraft] = useState(false);

  const n = Number(credits);
  const a = Number(amount);
  const summary =
    n > 0 && a > 0
      ? `${shop} pays ${SYMBOL[currency]}${a.toLocaleString("en-US")} for ${n.toLocaleString("en-US")} try-ons — ${SYMBOL[currency]}${(a / n).toFixed(2)} each.`
      : null;

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="action" value="create" />
      <input type="hidden" name="shop" value={shop} />
      <input type="hidden" name="send" value={draft ? "draft" : "send"} />

      <div className="row">
        <label>
          Credits
          <input
            className="input"
            name="credits"
            type="number"
            min={1}
            max={1000000}
            required
            placeholder="10000"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
        </label>
        <label>
          Amount
          <input
            className="input"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            required
            placeholder="29000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Currency
          <select className="input" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR ₹</option>
            <option value="USD">USD $</option>
          </select>
        </label>
      </div>

      <label>
        What the merchant sees
        <input className="input" name="description" maxLength={300} placeholder="Diwali top-up, as agreed on the call" />
      </label>

      <label>
        Internal note (never shown to them)
        <input className="input" name="internalNote" maxLength={300} placeholder="Quoted by Ujjwal, 20% off list" />
      </label>

      {summary ? <p className="sub">{summary}</p> : null}

      <div className="row wrap" style={{ alignItems: "center" }}>
        <Submit draft={draft} />
        <button type="button" className="btn ghost sm" onClick={() => setDraft(!draft)}>
          {draft ? "Switch to sending" : "Switch to draft"}
        </button>
      </div>

      <p className="hint">
        {draft
          ? "A draft stays private and cannot be paid until you send it."
          : "Sending makes it visible in the merchant's billing portal, where they can pay it."}
      </p>

      {state.error ? <p className="error-text">{state.error}</p> : null}
      {state.message ? <p className="ok-text">{state.message}</p> : null}
    </form>
  );
}

export function InvoiceRowActions({ id, status }: { id: string; status: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(invoiceAction, {});
  if (status === "paid" || status === "cancelled") return null;

  return (
    <form action={formAction} className="row" style={{ gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      {status === "draft" ? (
        <button className="btn ghost sm" name="action" value="send" type="submit">Send</button>
      ) : null}
      <button
        className="btn danger sm"
        name="action"
        value="cancel"
        type="submit"
        onClick={(e) => {
          if (!window.confirm("Cancel this invoice? The merchant will no longer see it.")) e.preventDefault();
        }}
      >
        Cancel
      </button>
      {state.error ? <span className="error-text">{state.error}</span> : null}
    </form>
  );
}
