"use client";

// Run a try-on from the platform.
//
// Two images in, one out. The files are read to data URLs and handed to a
// server action, so nothing here holds a session or talks to the generator
// directly — and the result arrives as a link on our own domain.

import { useEffect, useRef, useState } from "react";
import { pollPlayground, runPlayground } from "@/app/actions";

/** What a phone may hand us; it is shrunk before it goes anywhere. */
const MAX_BYTES = 20 * 1024 * 1024;
/** Longest edge after resizing — ample for try-on, small enough to upload fast. */
const MAX_EDGE = 1600;
const POLL_MS = 12000;
/** Generations settle well inside this; past it something is wrong. */
const GIVE_UP_MS = 5 * 60 * 1000;

type Phase = "idle" | "running" | "done" | "error";

/**
 * Reads a photo and re-draws it as a JPEG no larger than MAX_EDGE.
 *
 * Phone photos are routinely 5–12MB, and two of them as data URLs would blow
 * past what a server action accepts. Re-drawing also drops the camera's EXIF —
 * location included — before the photo leaves the device.
 */
async function readFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file could not be read as an image.");
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("That file could not be read as an image.");
  // White under any transparency, since JPEG has none.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
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
          if (file.size > MAX_BYTES) return onPick(null, "That image is larger than 20MB.");
          try {
            onPick(await readFile(file));
          } catch (error) {
            onPick(null, error instanceof Error ? error.message : "That file could not be read.");
          }
        }}
      />
    </label>
  );
}

export function Playground({ credits }: { credits: number }) {
  const [person, setPerson] = useState<string | null>(null);
  const [garment, setGarment] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [left, setLeft] = useState(credits);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A run outlives a click, so stop polling if the page goes away.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function start() {
    if (!consent) {
      setMessage("Confirm that you are an adult and have permission to use the photo.");
      setPhase("error");
      return;
    }
    if (!person || !garment) {
      setMessage("Add both a photo and a product image.");
      setPhase("error");
      return;
    }

    setPhase("running");
    setMessage("");
    setResult(null);

    const fail = (text: string) => {
      setPhase("error");
      setMessage(text);
    };

    let started: Awaited<ReturnType<typeof runPlayground>>;
    try {
      started = await runPlayground({ personImage: person, garmentImage: garment, title, consent });
    } catch {
      return fail("That run could not be started. Check your connection and try again.");
    }
    if (started.error || !started.taskId) return fail(started.error || "That run could not be started.");
    if (typeof started.creditsLeft === "number") setLeft(started.creditsLeft);

    const runId = started.taskId;
    const deadline = Date.now() + GIVE_UP_MS;
    const check = async () => {
      let status: Awaited<ReturnType<typeof pollPlayground>>;
      try {
        status = await pollPlayground(runId);
      } catch {
        // A dropped request is not a failed run; keep trying until the deadline.
        if (Date.now() > deadline) return fail("Lost contact with the run. Check Generations in a minute.");
        timer.current = setTimeout(check, POLL_MS);
        return;
      }

      if (status.status === "success" && "imageToken" in status && status.imageToken) {
        // Served through this site, so the page only ever talks to its own origin.
        setResult(`/i/${status.imageToken}`);
        setPhase("done");
        return;
      }
      if (status.status === "failed") return fail(status.message || "That try-on did not finish.");
      if (Date.now() > deadline) return fail("This is taking longer than expected. Check Generations in a minute.");
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
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result} alt="AI-generated try-on preview" />
                <p className="hint">AI-generated preview. It may differ from the real garment.</p>
              </>
            ) : (
              <p className="result-idle">Your try-on appears here.</p>
            )}
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14 }}>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I am 18 or older, and this is my photo or I have the person’s permission to use it for AI try-on.</span>
          </label>
          <button className="btn violet wide" style={{ marginTop: 14 }} onClick={start} disabled={busy || left <= 0 || !consent}>
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
