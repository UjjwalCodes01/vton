"use client";

// A form that runs one store action and says what happened.
//
// Confirmation lives here rather than in a modal: a destructive action asks for
// the shop domain to be typed, a merely serious one asks yes or no, and the
// button reports its own progress so nothing needs a spinner overlay.

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { storeAction, type ActionState } from "@/app/actions";

function Submit({ label, className, busy }: { label: string; className: string; busy?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? busy || "Working…" : label}
    </button>
  );
}

export function ActionForm({
  shop,
  action,
  label,
  className = "btn ghost",
  confirm,
  typeToConfirm,
  children,
  hidden = {},
}: {
  shop: string;
  action: string;
  label: string;
  className?: string;
  confirm?: string;
  typeToConfirm?: string;
  children?: React.ReactNode;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(storeAction, {});

  return (
    <form
      action={formAction}
      className="stack"
      onSubmit={(event) => {
        if (typeToConfirm) {
          const answer = window.prompt("This cannot be undone.\n\nType the store domain to confirm:");
          if (answer !== typeToConfirm) {
            event.preventDefault();
            if (answer !== null) window.alert("That did not match. Nothing was changed.");
            return;
          }
          const field = event.currentTarget.elements.namedItem("confirm") as HTMLInputElement | null;
          if (field) field.value = answer;
        } else if (confirm && !window.confirm(confirm)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="shop" value={shop} />
      <input type="hidden" name="action" value={action} />
      {typeToConfirm ? <input type="hidden" name="confirm" defaultValue="" /> : null}
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
      <Submit label={label} className={className} />
      {state.error ? <p className="error-text">{state.error}</p> : null}
      {state.message ? <p className="ok-text">{state.message}</p> : null}
    </form>
  );
}
