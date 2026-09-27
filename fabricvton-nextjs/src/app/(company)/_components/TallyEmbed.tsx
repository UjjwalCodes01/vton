"use client";

import Script from "next/script";

declare global {
  interface Window {
    Tally?: { loadEmbeds: () => void };
  }
}

/**
 * A Tally form that grows to its full height. Tally's embed script reads `data-tally-src`, loads the form and
 * resizes the iframe as the respondent moves through it, so long forms are never cut off.
 */
export default function TallyEmbed({ formId, title, source }: { formId: string; title: string; source: string }) {
  const src = `https://tally.so/embed/${formId}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&source=${encodeURIComponent(source)}`;
  return (
    <>
      <iframe data-tally-src={src} title={title} loading="lazy" />
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" onReady={() => window.Tally?.loadEmbeds()} />
    </>
  );
}
