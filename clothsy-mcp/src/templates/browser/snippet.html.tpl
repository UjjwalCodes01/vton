<!-- On the product page. Set data-product-id to YOUR product id. -->
<div id="clothsy-tryon" data-product-id="denim-jacket">
  <button type="button" id="tryon-open">Try it on</button>
  <dialog id="tryon-dialog">
    <form method="dialog" id="tryon-form">
      <input id="tryon-photo" type="file" accept="image/jpeg,image/png" required />
      <label>
        <input id="tryon-consent" type="checkbox" required />
        I'm 18 or over, this is a photo of me, and I agree to it being processed to create a
        virtual try-on. <a href="/privacy" target="_blank">How we use it</a>
      </label>
      <button type="submit" id="tryon-go">See it on me</button>
      <button type="button" id="tryon-close">Close</button>
      <p id="tryon-status" role="status" aria-live="polite"></p>
      <figure id="tryon-figure" hidden>
        <img id="tryon-result" alt="AI-generated preview of you wearing this item" />
        <figcaption>AI-generated try-on. Fit and colour may differ from the real item.</figcaption>
      </figure>
    </form>
  </dialog>
</div>
<script src="/tryon.js" defer></script>
