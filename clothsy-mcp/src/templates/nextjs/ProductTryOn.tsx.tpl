"use client";

import { TryOnButton } from "clothsy-ai/react";

/** Try-on button for a product page. Talks only to /api/tryon; the API key never reaches the browser. */
export function ProductTryOn({ productId }: { productId: string }) {
  return (
    <div className="product-tryon">
      <TryOnButton productId={productId} endpoint="/api/tryon" label="Try it on" />
      <p className="product-tryon-note">
        Try-on previews are AI-generated. <a href="/privacy">How we use your photo</a>
      </p>
    </div>
  );
}
