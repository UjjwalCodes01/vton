import { createTryOnRoute } from "clothsy-ai/next";

// Vercel: allow up to 60 s for the request that uploads the photo and starts the try-on.
export const maxDuration = 60;

/**
 * Look the product up in YOUR catalogue, on the server.
 * {{PRODUCT_LOOKUP_NOTE}}
 * Return null for unknown products or products that shouldn't offer try-on.
 * Never use an image URL sent by the browser.
 */
async function findProduct(productId: string): Promise<{ imageUrl: string; title: string } | null> {
  // TODO: replace with the store's real product lookup (database, CMS or commerce API).
  const products: Record<string, { imageUrl: string; title: string }> = {
    "denim-jacket": { imageUrl: "https://cdn.example.com/denim-jacket.jpg", title: "Cropped denim jacket" },
  };
  return products[productId] ?? null;
}

export const { POST, GET } = createTryOnRoute({
  resolveProduct: async (productId) => {
    const product = await findProduct(productId);
    // imageUrl must be a public HTTPS JPEG/PNG URL that answers 200 without redirects.
    return product ? { imageUrl: product.imageUrl, title: product.title.slice(0, 120) } : null;
  },
});
