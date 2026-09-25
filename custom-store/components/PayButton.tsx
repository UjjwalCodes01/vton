"use client";

// Opening Razorpay's payment sheet, and reporting what came back.
//
// The browser is handed an order id and nothing else. It cannot alter the
// amount, the invoice or the store — those live on the order Razorpay already
// holds, and the result is verified against our key secret server-side before a
// single credit is granted.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPayment, startPayment } from "@/app/actions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (x: unknown) => void) => void };
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_JS;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function PayButton({
  invoiceId,
  storeName,
  contactEmail,
  label,
}: {
  invoiceId: string;
  storeName: string;
  contactEmail?: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "bad" | "good"; text: string } | null>(null);

  async function pay() {
    setBusy(true);
    setNote(null);

    const ready = await loadCheckout();
    if (!ready) {
      setBusy(false);
      setNote({ tone: "bad", text: "Could not load the payment window. Check your connection or any ad blocker, then try again." });
      return;
    }

    const started = await startPayment(invoiceId);
    if (started.error || !started.order) {
      setBusy(false);
      setNote({ tone: "bad", text: started.error || "Could not start the payment." });
      return;
    }

    const order = started.order;
    const checkout = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Clothsy AI",
      description: order.description,
      prefill: contactEmail ? { email: contactEmail } : undefined,
      notes: { store: storeName },
      theme: { color: "#6c4fe0" },
      modal: {
        // Closing the sheet is not a failure — nothing was charged.
        ondismiss: () => {
          setBusy(false);
          setNote(null);
        },
      },
      handler: async (response: unknown) => {
        const fields = response as {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };
        const result = await confirmPayment(invoiceId, fields);
        setBusy(false);
        if (result.error) {
          setNote({ tone: "bad", text: result.error });
          return;
        }
        setNote({ tone: "good", text: result.message || "Payment received." });
        router.refresh();
      },
    });

    checkout.on("payment.failed", (event: unknown) => {
      const detail = (event as { error?: { description?: string } })?.error?.description;
      setBusy(false);
      setNote({ tone: "bad", text: detail ? `Payment failed: ${detail}` : "That payment did not go through. Nothing was charged." });
    });

    checkout.open();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
      <button className="btn" onClick={pay} disabled={busy}>
        {busy ? "Opening…" : label}
      </button>
      {note ? <p className={`notice ${note.tone}`} style={{ margin: 0 }}>{note.text}</p> : null}
    </div>
  );
}
