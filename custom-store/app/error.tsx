"use client";

// Anything that throws while rendering a portal page lands here instead of a
// blank screen. Server errors reach the browser with their detail removed —
// only a `digest` id, which matches the server log line, so it's shown as a
// reference someone can quote to support.

import Link from "next/link";
import { useEffect } from "react";

export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="centre">
      <div className="signin" role="alert">
        <div>
          <h1 className="display">Something went wrong</h1>
          <p className="sub" style={{ marginTop: 8 }}>
            This page couldn&apos;t load. It&apos;s usually a brief hiccup — try again, and if it keeps happening, email{" "}
            <a href="mailto:contact@fabricvton.com">contact@fabricvton.com</a>
            {error.digest ? " with the reference below" : ""}.
          </p>
        </div>
        {error.digest ? <p className="mono sub">Reference: {error.digest}</p> : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn violet" type="button" onClick={() => retry()}>
            Try again
          </button>
          <Link className="btn ghost" href="/">
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
