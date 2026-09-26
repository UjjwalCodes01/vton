"use client";

// Run a try-on from the platform.
//
// Two images in, one out. The files are read to data URLs and handed to a
// server action, so nothing here holds a session or talks to the generator
// directly — and the result arrives as a link on our own domain.

import { useEffect, useRef, useState } from "react";
import { pollPlayground, runPlayground } from "@/app/actions";

const MAX_BYTES = 8 * 1024 * 1024;
const POLL_MS = 3000;
/** Generations settle well inside this; past it something is wrong. */
const GIVE_UP_MS = 3 * 60 * 1000;

type Phase = "idle" | "running" | "done" | "error";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

function Drop({
  label,
  hint,
  value,
  onPick,
}: {
  label: string;
  hint: string;
  value: string | null;
  onPick: (dataUrl: string | null, error?: string) => void;
}) {
  return (
    <label className="drop">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" />
      ) : (
        <span>
          {label}
          <span className="drop-hint">{hint}</span>
        </span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_BYTES) return onPick(null, "That image is larger than 8MB.");
          try {
            onPick(await readFile(file));
          } catch {
            onPick(null, "That file could not be read.");
          }
        }}
      />
    </label>
  );
}

export function Playground({ credits, apiBase }: { credits: number; apiBase: string }) {
  const [person, setPerson] = useState<string | null>(null);
  const [garment, setGarment] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [left, setLeft] = useState(credits);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A run outlives a click, so stop polling if the page goes away.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function start() {
    if (!person || !garment) {
      setMessage("Add both a photo and a product image.");
      setPhase("error");
      return;
    }

    setPhase("running");
    setMessage("");
    setResult(null);

    const started = await runPlayground({ personImage: person, garmentImage: garment, title });
    if (started.error || !started.taskId) {
      setPhase("error");
      setMessage(started.error || "That run could not be started.");
      return;
    }
    if (typeof started.creditsLeft === "number") setLeft(started.creditsLeft);

    const deadline = Date.now() + GIVE_UP_MS;
    const check = async () => {
      const status = await pollPlayground(started.taskId!);

      if (status.status === "success" && "imageToken" in status && status.imageToken) {
        setResult(`${apiBase}/i/${status.imageToken}`);
        setPhase("done");
        return;
      }
      if (status.status === "failed") {
        setPhase("error");
        setMessage(status.message || "That try-on did not finish.");
        return;
      }
      if (Date.now() > deadline) {
        setPhase("error");
        setMessage("This is taking longer than expected. Check Generations in a minute.");
        return;
      }
      timer.current = setTimeout(check, POLL_MS);
    };
    timer.current = setTimeout(check, POLL_MS);
  }

  const busy = phase === "running";

  return (
    <>
      {message ? <p className={`notice ${phase === "error" ? "bad" : "info"}`}>{message}</p> : null}

      <div className="play">
        <div className="pane">
          <h3>Person</h3>
          <Drop
            label="Drop a photo, or click to choose"
            hint="Full body, facing forward"
            value={person}
            onPick={(value, error) => {
              setPerson(value);
              if (error) { setMessage(error); setPhase("error"); }
            }}
          />
        </div>

        <div className="pane">
          <h3>Product</h3>
          <Drop
            label="Drop a product image"
            hint="One garment, plain background"
            value={garment}
            onPick={(value, error) => {
              setGarment(value);
              if (error) { setMessage(error); setPhase("error"); }
            }}
          />
          <label style={{ marginTop: 12 }}>
            Title
            <input
              className="input"
              value={title}
              maxLength={120}
              placeholder="Red cotton t-shirt"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <p className="hint">Helps place the garment — a shirt hangs differently from a dress.</p>
        </div>

        <div className="pane">
          <h3>Result</h3>
          <div className="result">
            {busy ? (
              <div className="result-idle">
                <div className="spinner" />
                Rendering — usually under fifteen seconds.
              </div>
            ) : result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result} alt="Try-on result" />
            ) : (
              <p className="result-idle">Your try-on appears here.</p>
            )}
          </div>

          <button className="btn violet wide" style={{ marginTop: 14 }} onClick={start} disabled={busy || left <= 0}>
            {busy ? "Running…" : left <= 0 ? "No credits left" : "Run try-on"}
          </button>

          <p className="hint">
            {left} credit{left === 1 ? "" : "s"} left · one per finished try-on. Failed runs are
            not charged.
          </p>

          {result ? (
            <a className="btn ghost wide" style={{ marginTop: 10 }} href={result} target="_blank" rel="noopener noreferrer">
              Open full size
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
