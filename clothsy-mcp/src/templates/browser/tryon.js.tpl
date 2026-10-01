// public/tryon.js — talks only to YOUR server (/tryon). The API key never reaches the browser.
(() => {
  const root = document.getElementById("clothsy-tryon");
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const dialog = $("tryon-dialog");
  const status = $("tryon-status");

  // Shrink to at most 1600 px and re-encode as JPEG: keeps it under the 4 MB limit and
  // strips EXIF data such as GPS location.
  async function shrink(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  $("tryon-open").addEventListener("click", () => dialog.showModal());
  $("tryon-close").addEventListener("click", () => dialog.close());

  $("tryon-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("tryon-photo").files[0];
    if (!file || !$("tryon-consent").checked) {
      status.textContent = "Choose a photo and tick the box first.";
      return;
    }
    $("tryon-go").disabled = true;
    $("tryon-figure").hidden = true;
    try {
      status.textContent = "Preparing your photo…";
      const form = new FormData();
      form.append("photo", await shrink(file), "photo.jpg");
      form.append("productId", root.dataset.productId);
      form.append("consent", "true");
      form.append("requestId", crypto.randomUUID()); // one per click; reused if you retry this click

      status.textContent = "Uploading your photo…";
      const start = await fetch("/tryon", { method: "POST", body: form });
      const started = await start.json().catch(() => ({}));
      if (!start.ok) throw new Error(started.message || "We couldn't start your try-on.");

      status.textContent = "Creating your try-on. This usually takes 20–40 seconds…";
      for (let i = 0; i < 72; i++) { // up to 3 minutes
        await sleep(2500);
        const res = await fetch("/tryon/" + encodeURIComponent(started.id));
        const body = await res.json().catch(() => ({}));
        if (body.status === "success") {
          $("tryon-result").src = body.resultUrl;
          $("tryon-figure").hidden = false;
          status.textContent = "";
          return;
        }
        if (body.status === "failed" || (!res.ok && res.status !== 429)) {
          throw new Error(body.message || "We couldn't create your try-on. Please try another photo.");
        }
      }
      throw new Error("This is taking longer than usual. Please try again.");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      $("tryon-go").disabled = false;
    }
  });
})();
