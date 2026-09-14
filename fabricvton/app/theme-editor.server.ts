/** Handle of the theme app block: its filename in extensions/tryon-widget/blocks. */
const BLOCK_HANDLE = "tryon_button";

/**
 * Theme editor deep link that opens the product template with the try-on block
 * already inserted into the main product section.
 *
 * Saves the merchant from finding "Add block → Apps" by hand, which is where
 * most new installs stall. The api key must be this app's client id; with a
 * mismatched key Shopify just opens the editor without adding anything.
 */
export function themeEditorAddBlockUrl(shop: string) {
  const params = new URLSearchParams({
    template: "product",
    addAppBlockId: `${process.env.SHOPIFY_API_KEY ?? ""}/${BLOCK_HANDLE}`,
    target: "mainSection",
  });
  return `https://${shop}/admin/themes/current/editor?${params.toString()}`;
}

/** Theme editor on the product template, for editing an already-placed block. */
export function themeEditorProductUrl(shop: string) {
  return `https://${shop}/admin/themes/current/editor?template=product`;
}
