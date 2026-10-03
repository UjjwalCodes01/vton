"use client";

// Anything that throws while rendering a dashboard page (the API unreachable, a
// wrong ADMIN_API_TOKEN, a store that no longer exists) lands here instead of
// Next's bare "Application error". Server errors reach the browser with their
// detail removed; the `digest` matches the server log line.

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="login-body">
      <div className="login" role="alert">
        <h1>Something went wrong</h1>
        <p className="sub">
          This page couldn&apos;t load. The backend may be unreachable or restarting; try again in a moment.
        </p>
        {error.digest ? <p className="mono sub">Reference: {error.digest}</p> : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => retry()}>
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
