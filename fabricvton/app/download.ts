import { useCallback, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

/**
 * Downloads a file from one of this app's resource routes.
 *
 * Embedded pages can't hand downloads to a plain link or a `target="_blank"`
 * form: the new tab carries no session token, so `authenticate.admin` sends it
 * to the login flow instead of returning the file. App Bridge attaches the
 * session token to `fetch()` calls made to the app's own origin, so the file is
 * fetched here and passed to the browser as a blob.
 */
export function useDownload() {
  const shopify = useAppBridge();
  const [pending, setPending] = useState<string | null>(null);

  const download = useCallback(
    async (path: string, fallbackName: string) => {
      setPending(path);
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const name = filenameFrom(res.headers.get("Content-Disposition")) ?? fallbackName;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoked later rather than immediately: some browsers read the blob
        // after click() returns.
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch {
        shopify.toast.show("Couldn't download the file. Please try again.", {
          isError: true,
        });
      } finally {
        setPending(null);
      }
    },
    [shopify],
  );

  return { download, pending };
}

function filenameFrom(disposition: string | null) {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? null;
}
