"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

// ---------------------------------------------------------------------------
// Headless hook

export type TryOnState = "idle" | "preparing" | "uploading" | "processing" | "success" | "error";

export interface UseTryOnOptions {
  /** Your server route created with `createTryOnRoute`. Default `/api/tryon`. */
  endpoint?: string;
  /** Poll interval in ms. Default 2 500. */
  intervalMs?: number;
  /** Give up after this many ms. Default 180 000. */
  timeoutMs?: number;
}

export interface UseTryOnResult {
  state: TryOnState;
  /**
   * Start a try-on. Only call this after the shopper has given consent: the
   * request tells your server that consent was collected.
   */
  start: (file: File | Blob, productId: string) => Promise<void>;
  reset: () => void;
  resultUrl: string | null;
  error: string | null;
}

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600;
const DEFAULT_ERROR = "Virtual try-on isn't available right now. Please try again later.";
const FORMAT_ERROR = "Please upload a JPEG or PNG photo under 4 MB.";

class TryOnUiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

/** Headless try-on logic for building your own UI. */
export function useTryOn(options: UseTryOnOptions = {}): UseTryOnResult {
  const endpoint = options.endpoint ?? "/api/tryon";
  const intervalMs = options.intervalMs ?? 2_500;
  const timeoutMs = options.timeoutMs ?? 180_000;
  const [state, setState] = useState<TryOnState>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setState("idle");
    setResultUrl(null);
    setError(null);
  }, []);

  useEffect(() => () => runRef.current?.abort(), []);

  const start = useCallback(
    async (file: File | Blob, productId: string) => {
      runRef.current?.abort();
      const run = new AbortController();
      runRef.current = run;
      const { signal } = run;
      const active = () => runRef.current === run && !signal.aborted;

      setResultUrl(null);
      setError(null);
      setState("preparing");
      try {
        const photo = await preparePhoto(file);
        if (!active()) return;

        setState("uploading");
        const form = new FormData();
        form.append("photo", photo, photo.type === "image/png" ? "photo.png" : "photo.jpg");
        form.append("productId", productId);
        form.append("consent", "true");
        form.append("requestId", crypto.randomUUID());
        const started = await postJson(endpoint, form, signal);
        if (!active()) return;
        const id = typeof started.id === "string" ? started.id : "";
        if (!id) throw new TryOnUiError(DEFAULT_ERROR);

        setState("processing");
        const deadline = Date.now() + timeoutMs;
        const pollUrl = `${endpoint}${endpoint.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}`;
        for (;;) {
          await wait(intervalMs, signal);
          if (!active()) return;
          let status: { status?: string; resultUrl?: string | null; message?: string } | null = null;
          try {
            status = await getJson(pollUrl, signal);
          } catch (err) {
            if (signal.aborted) return;
            // Transient polling errors (busy, network): keep trying until the deadline.
            if (!(err instanceof TryOnUiError) || !err.retryable) throw err;
          }
          if (!active()) return;
          if (status?.status === "success" && status.resultUrl) {
            setResultUrl(status.resultUrl);
            setState("success");
            return;
          }
          if (status?.status === "failed") {
            throw new TryOnUiError(status.message || "We couldn't create your try-on. Please try another photo.");
          }
          if (Date.now() >= deadline) {
            throw new TryOnUiError("This is taking longer than expected. Please try again in a moment.");
          }
        }
      } catch (err) {
        if (!active()) return;
        setError(err instanceof TryOnUiError ? err.message : DEFAULT_ERROR);
        setState("error");
      }
    },
    [endpoint, intervalMs, timeoutMs],
  );

  return { state, start, reset, resultUrl, error };
}

async function postJson(url: string, body: FormData, signal: AbortSignal): Promise<any> {
  return requestJson(url, { method: "POST", body, signal, credentials: "same-origin" });
}

async function getJson(url: string, signal: AbortSignal): Promise<any> {
  return requestJson(url, { method: "GET", signal, credentials: "same-origin", cache: "no-store" });
}

async function requestJson(url: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new TryOnUiError("We couldn't connect. Please check your connection and try again.", true);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data && typeof data.message === "string" ? data.message : DEFAULT_ERROR;
    throw new TryOnUiError(message, res.status === 429 || res.status >= 500);
  }
  return data ?? {};
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Downscale to ≤1600 px and re-encode as JPEG (also strips EXIF/location data). */
async function preparePhoto(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap === "function" && typeof document !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff"; // flatten PNG transparency for JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
        if (blob && blob.size <= MAX_BYTES) return blob;
      }
    } catch {
      // Fall through: the browser couldn't decode it (e.g. HEIC); try the original.
    }
  }
  const typeOk = file.type === "image/jpeg" || file.type === "image/png";
  if (!typeOk || file.size > MAX_BYTES) throw new TryOnUiError(FORMAT_ERROR);
  return file;
}

// ---------------------------------------------------------------------------
// Ready-made button + dialog

export interface TryOnButtonProps {
  productId: string;
  /** Your server route created with `createTryOnRoute`. Default `/api/tryon`. */
  endpoint?: string;
  /** Button text. Default "Try it on". */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Hint mobile browsers to open the camera. Omit to let shoppers pick from their gallery too. */
  capture?: "user" | "environment";
}

const CONSENT_TEXT =
  "I'm 18 or over, this is a photo of me, and I agree to it being processed to create a virtual try-on.";

const PROGRESS: Partial<Record<TryOnState, string>> = {
  preparing: "Preparing your photo…",
  uploading: "Uploading your photo…",
  processing: "Creating your try-on. This usually takes 20–40 seconds…",
};

const styles = {
  button: {
    font: "inherit",
    cursor: "pointer",
    padding: "0.7em 1.3em",
    borderRadius: "var(--clothsy-radius, 8px)",
    border: "1px solid var(--clothsy-accent, #111)",
    background: "var(--clothsy-accent, #111)",
    color: "var(--clothsy-accent-contrast, #fff)",
  },
  secondary: {
    font: "inherit",
    cursor: "pointer",
    padding: "0.6em 1.1em",
    borderRadius: "var(--clothsy-radius, 8px)",
    border: "1px solid var(--clothsy-border, #d4d4d4)",
    background: "transparent",
    color: "inherit",
  },
  dialog: {
    width: "min(92vw, 440px)",
    maxHeight: "90vh",
    overflow: "auto",
    padding: "1.25rem",
    border: "none",
    borderRadius: "var(--clothsy-radius-lg, 14px)",
    background: "var(--clothsy-bg, #fff)",
    color: "var(--clothsy-text, #111)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    fontFamily: "var(--clothsy-font, inherit)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  title: { margin: 0, fontSize: "1.15rem" },
  close: {
    font: "inherit",
    fontSize: "1.4rem",
    lineHeight: 1,
    cursor: "pointer",
    background: "transparent",
    border: "none",
    color: "inherit",
    padding: "0.2rem 0.4rem",
  },
  form: { display: "grid", gap: "0.9rem" },
  label: { display: "grid", gap: "0.35rem", fontWeight: 600 },
  consent: { display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.9rem", lineHeight: 1.4 },
  muted: { color: "var(--clothsy-muted, #666)", fontSize: "0.85rem", margin: 0 },
  status: { margin: 0, fontSize: "0.95rem" },
  error: { margin: 0, color: "var(--clothsy-error, #b42318)", fontSize: "0.95rem" },
  image: { width: "100%", height: "auto", borderRadius: "var(--clothsy-radius, 8px)", display: "block" },
  actions: { display: "flex", gap: "0.6rem", flexWrap: "wrap" },
} satisfies Record<string, CSSProperties>;

const BACKDROP_CSS = ".clothsy-tryon__dialog::backdrop{background:var(--clothsy-backdrop,rgba(0,0,0,.55))}";

/** A "Try it on" button that opens an accessible dialog for uploading a photo. */
export function TryOnButton({
  productId,
  endpoint = "/api/tryon",
  label = "Try it on",
  className,
  style,
  capture,
}: TryOnButtonProps) {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { state, start, reset, resultUrl, error } = useTryOn({ endpoint });

  const busy = state === "preparing" || state === "uploading" || state === "processing";
  const ids = {
    title: `${uid}-title`,
    file: `${uid}-file`,
    hint: `${uid}-hint`,
    consent: `${uid}-consent`,
  };

  const clearForm = useCallback(() => {
    reset();
    setFile(null);
    setConsent(false);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [reset]);

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    fileRef.current?.focus();
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  };

  // Native `close` fires for Esc, the close button and form method=dialog alike.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      clearForm();
      triggerRef.current?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [clearForm]);

  // Move focus to the outcome so screen readers and keyboard users land on it.
  useEffect(() => {
    if (state === "success") resultHeadingRef.current?.focus();
    if (state === "error") errorRef.current?.focus();
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setFormError("Please choose a photo.");
      fileRef.current?.focus();
      return;
    }
    if (!consent) {
      setFormError("Please tick the box to confirm you agree.");
      return;
    }
    setFormError(null);
    void start(file, productId);
  };

  const tryAnother = () => {
    clearForm();
    setTimeout(() => fileRef.current?.focus(), 0);
  };

  const rootClass = ["clothsy-tryon", className].filter(Boolean).join(" ");
  const showForm = state === "idle" || busy;

  return (
    <div className={rootClass} style={{ display: "inline-block", ...style }}>
      <style>{BACKDROP_CSS}</style>
      <button
        ref={triggerRef}
        type="button"
        className="clothsy-tryon__button"
        style={styles.button}
        aria-haspopup="dialog"
        onClick={open}
      >
        {label}
      </button>

      <dialog ref={dialogRef} className="clothsy-tryon__dialog" style={styles.dialog} aria-labelledby={ids.title}>
        <div className="clothsy-tryon__header" style={styles.header}>
          <h2 id={ids.title} className="clothsy-tryon__title" style={styles.title}>
            Virtual try-on
          </h2>
          <button type="button" className="clothsy-tryon__close" style={styles.close} aria-label="Close" onClick={close}>
            ×
          </button>
        </div>

        {showForm && (
          <form className="clothsy-tryon__form" style={styles.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
            <label htmlFor={ids.file} className="clothsy-tryon__label" style={styles.label}>
              Your photo
              <input
                ref={fileRef}
                id={ids.file}
                className="clothsy-tryon__file"
                type="file"
                accept="image/jpeg,image/png"
                capture={capture}
                required
                disabled={busy}
                aria-describedby={ids.hint}
                onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              />
            </label>
            <p id={ids.hint} className="clothsy-tryon__hint" style={styles.muted}>
              A clear, well-lit photo of just you, facing the camera. JPEG or PNG.
            </p>

            <label htmlFor={ids.consent} className="clothsy-tryon__consent" style={styles.consent}>
              <input
                id={ids.consent}
                type="checkbox"
                required
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.currentTarget.checked)}
              />
              <span>{CONSENT_TEXT}</span>
            </label>

            {formError && (
              <p className="clothsy-tryon__error" style={styles.error} role="alert">
                {formError}
              </p>
            )}

            <div className="clothsy-tryon__actions" style={styles.actions}>
              <button type="submit" className="clothsy-tryon__submit" style={styles.button} disabled={busy}>
                {busy ? "Working…" : "Create my try-on"}
              </button>
            </div>
          </form>
        )}

        <p className="clothsy-tryon__status" style={styles.status} role="status" aria-live="polite">
          {PROGRESS[state] ?? ""}
        </p>

        {state === "success" && resultUrl && (
          <div className="clothsy-tryon__result" style={styles.form}>
            <p ref={resultHeadingRef} tabIndex={-1} style={styles.status}>
              Here's how it looks on you.
            </p>
            <img className="clothsy-tryon__image" style={styles.image} src={resultUrl} alt="You wearing this item" />
            <p style={styles.muted}>This image is available for 24 hours.</p>
            <div className="clothsy-tryon__actions" style={styles.actions}>
              <button type="button" className="clothsy-tryon__retry" style={styles.secondary} onClick={tryAnother}>
                Try another photo
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="clothsy-tryon__result" style={styles.form}>
            <p ref={errorRef} tabIndex={-1} className="clothsy-tryon__error" style={styles.error} role="alert">
              {error}
            </p>
            <div className="clothsy-tryon__actions" style={styles.actions}>
              <button type="button" className="clothsy-tryon__retry" style={styles.secondary} onClick={tryAnother}>
                Try another photo
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default TryOnButton;
