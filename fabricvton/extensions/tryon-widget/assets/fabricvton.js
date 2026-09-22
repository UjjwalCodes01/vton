/*
 * Clothsy AI try-on widget.
 *
 * Loaded once per product page with `defer`, so it never blocks rendering.
 * The modal DOM is built lazily on the first click — a shopper who never opens
 * the widget pays only for this file, which the Shopify CDN caches.
 *
 * Multiple instances of the block on one page are safe: the script guards
 * against double-initialisation and uses a single shared modal driven by event
 * delegation, so every button works instead of only the first one.
 */
(function () {
  "use strict";

  if (window.__fabricVTONReady) return;
  window.__fabricVTONReady = true;

  var MAX_POLL_ATTEMPTS = 60; // 60 x 3s = 3 minutes
  var POLL_INTERVAL_MS = 3000;
  var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  // Wording of the consent shown to the shopper. Bump this whenever the text
  // changes, so a stored consent record always points at what was agreed to.
  var CONSENT_VERSION = "2026-09-20.v1";
  var PRIVACY_URL = "https://www.fabricvton.com/widget-privacy";
  var MAX_IMAGE_EDGE = 1024;

  var modal = null; // built on first open
  var els = {};
  var ctx = null; // config of the button that opened the modal
  var selectedFile = null;
  var capturedEmail = "";
  // The photo as the shopper sees it, kept so the result can be compared
  // against it without asking the browser to read the file a second time.
  var originalDataUrl = "";

  // Circumference of the progress ring (r=46), so the arc can be driven by
  // stroke-dashoffset instead of redrawing it.
  var RING = 2 * Math.PI * 46;

  var ICONS = {
    upload:
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 8v6m0-6l-2.5 2.5M12 8l2.5 2.5"/></svg>',
    camera:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    lock:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/></svg>',
    cart:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.2 10.4a2 2 0 002 1.6h7.4a2 2 0 002-1.55L20.5 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>',
    compare:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M8 8.5L4.5 12 8 15.5M16 8.5l3.5 3.5-3.5 3.5"/></svg>',
    grip:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7.5L4.5 12 9 16.5M15 7.5l4.5 4.5L15 16.5"/></svg>',
    check:
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
  };

  // ── Session id (anonymous, per browser tab) ──────────────
  // The backend rate-limits per session id and only accepts [A-Za-z0-9_-]{4,64},
  // so this concatenates two draws: a bare Math.random().toString(36) can come out
  // only a character or two long, which would fail that check and silently push
  // the shopper onto a coarser shared bucket.
  function newSessionId() {
    return (
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    ).replace(/[^a-z0-9]/g, "") + "0000".slice(0, 4);
  }

  var sessionId = "";
  try {
    sessionId = sessionStorage.getItem("fvton_sid") || "";
    if (!sessionId) {
      sessionId = newSessionId();
      sessionStorage.setItem("fvton_sid", sessionId);
    }
  } catch (e) {
    // Private mode or blocked storage — fall back to a per-load id.
    sessionId = newSessionId();
  }

  function parseJsonSafely(res) {
    return res.text().then(function (text) {
      try {
        return text ? JSON.parse(text) : {};
      } catch (err) {
        return {
          error: res.ok
            ? "Unexpected response from server."
            : "Server returned an invalid response (" + res.status + ")."
        };
      }
    });
  }

  // ── Stylesheet (loaded on first intent, not on page load) ─
  // The block no longer links fabricvton.css: it styles only the modal, and a
  // render-blocking request on every product page view is exactly what the
  // storefront speed check penalises. It is fetched when a shopper hovers,
  // focuses, or taps the button, so by the time they click it is usually ready.

  var stylesPromise = null;

  function loadStyles(url) {
    if (stylesPromise) return stylesPromise;
    stylesPromise = new Promise(function (resolve) {
      if (!url) return resolve();
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      // An unstyled modal is still better than no modal, so a failed or slow
      // stylesheet never blocks opening it.
      link.onload = resolve;
      link.onerror = resolve;
      setTimeout(resolve, 3000);
      document.head.appendChild(link);
    });
    return stylesPromise;
  }

  function warmStyles(event) {
    var button = event.target.closest && event.target.closest("[data-fabricvton-button]");
    if (button) loadStyles(button.getAttribute("data-css-url"));
  }

  document.addEventListener("pointerover", warmStyles, { passive: true });
  document.addEventListener("focusin", warmStyles);

  // ── Modal construction (first open only) ─────────────────

  function buildModal() {
    var backdrop = document.createElement("div");
    backdrop.className = "fabricvton-backdrop";
    backdrop.style.display = "none";

    var dialog = document.createElement("div");
    dialog.className = "fabricvton-modal";
    dialog.style.display = "none";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Virtual try-on");

    dialog.innerHTML = [
      '<div class="fabricvton-bar">',
      '  <span class="fabricvton-brand">Clothsy <i>AI</i></span>',
      '  <button type="button" class="fabricvton-close" data-action="close" aria-label="Close try-on">&times;</button>',
      '</div>',

      '<div class="fabricvton-step" data-step="email">',
      '  <h2>See it on you.</h2>',
      '  <p class="fabricvton-lead">Enter your email to unlock your personalised virtual try-on.</p>',
      '  <div class="fabricvton-stack">',
      '    <label class="fabricvton-visually-hidden" for="fabricvton-email">Email address</label>',
      '    <input id="fabricvton-email" class="fabricvton-field" type="email" placeholder="your@email.com" autocomplete="email" />',
      '    <button type="button" class="fabricvton-primary" data-action="continue">Continue</button>',
      '    <p class="fabricvton-lead" data-role="email-error" style="display:none;color:#d23b3b;margin:0;font-size:13px;">Please enter a valid email address.</p>',
      '  </div>',
      '</div>',

      '<div class="fabricvton-step" data-step="upload">',
      '  <h2>See it on you.</h2>',
      '  <p class="fabricvton-lead" data-role="upload-lead"></p>',
      '  <div class="fabricvton-dropzone" data-action="pick" role="button" tabindex="0">',
      '    ' + ICONS.upload,
      '    <b>Choose a photo</b>',
      '    <span>Drag and drop or click to upload &bull; JPG or PNG, max 10MB</span>',
      '  </div>',
      '  <div class="fabricvton-or">or</div>',
      '  <button type="button" class="fabricvton-secondary" data-action="camera">' + ICONS.camera + 'Take a photo</button>',
      '  <input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden data-role="file" />',
      '  <input type="file" accept="image/*" capture="user" hidden data-role="camera-file" />',
      '  <p class="fabricvton-private">' + ICONS.lock + 'Your photo stays private.</p>',
      '</div>',

      '<div class="fabricvton-step" data-step="confirm">',
      '  <h2>Confirm your photo</h2>',
      '  <p class="fabricvton-lead">Stand upright, face visible, shoulders down for the best result.</p>',
      '  <img class="fabricvton-photo" alt="The photo you chose" data-role="preview" />',
      '  <div class="fabricvton-consent">',
      '    <label class="fabricvton-consent-row">',
      '      <input type="checkbox" data-role="consent" />',
      '      <span data-role="consent-text"></span>',
      '    </label>',
      '    <p class="fabricvton-consent-note">Your photo is used only to create this try-on and is not stored. You can withdraw consent or ask for your data to be deleted at any time &mdash; see the <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">privacy notice</a>.</p>',
      '  </div>',
      '  <div class="fabricvton-stack">',
      '    <button type="button" class="fabricvton-primary" data-action="generate" disabled>Continue</button>',
      '    <button type="button" class="fabricvton-secondary" data-action="change">Change photo</button>',
      '  </div>',
      '</div>',

      '<div class="fabricvton-step fabricvton-loading" data-step="loading">',
      '  <h2>Creating your try-on&hellip;</h2>',
      '  <p class="fabricvton-lead">This usually takes a few seconds.</p>',
      '  <svg class="fabricvton-ring" viewBox="0 0 100 100" role="status" aria-live="polite" aria-label="Creating your try-on">',
      '    <circle class="fv-track" cx="50" cy="50" r="46"></circle>',
      '    <circle class="fv-arc" cx="50" cy="50" r="46" data-role="arc"></circle>',
      '  </svg>',
      '  <ul class="fabricvton-steps" data-role="stages">',
      '    <li data-state="active"><b></b>Analysing your photo</li>',
      '    <li data-state="idle"><b></b>Preparing the outfit</li>',
      '    <li data-state="idle"><b></b>Generating your look</li>',
      '  </ul>',
      '  <p class="fabricvton-almost" data-role="almost" style="visibility:hidden;">Almost there&hellip;</p>',
      '</div>',

      '<div class="fabricvton-step" data-step="result">',
      '  <h2>Your try-on</h2>',
      '  <img class="fabricvton-result-img" alt="Virtual try-on result" data-role="result" />',
      '  <div class="fabricvton-compare" data-role="compare" style="display:none;">',
      '    <img alt="Virtual try-on result" data-role="compare-result" />',
      '    <div class="fabricvton-compare-top" data-role="compare-top">',
      '      <img alt="Your original photo" data-role="compare-original" />',
      '    </div>',
      '    <div class="fabricvton-compare-line" data-role="compare-line"><span class="fabricvton-compare-grip">' + ICONS.grip + '</span></div>',
      '    <span class="fabricvton-tag fabricvton-tag-before">Original</span>',
      '    <span class="fabricvton-tag fabricvton-tag-after">Try-on</span>',
      '    <input class="fabricvton-compare-range" type="range" min="0" max="100" value="50" data-role="compare-range" aria-label="Compare your photo with the try-on" />',
      '  </div>',
      '  <div class="fabricvton-center">',
      '    <button type="button" class="fabricvton-toggle" data-action="compare" aria-pressed="false">' + ICONS.compare + 'Compare</button>',
      '  </div>',
      '  <div class="fabricvton-actions">',
      '    <button type="button" class="fabricvton-secondary" data-action="reset">Try another photo</button>',
      '    <button type="button" class="fabricvton-primary" data-action="add-to-cart" style="flex:1.2;">' + ICONS.cart + 'Add to cart</button>',
      '  </div>',
      '  <p class="fabricvton-disclaimer">Images are generated in real time and are not stored.</p>',
      '</div>',

      '<div class="fabricvton-step fabricvton-done" data-step="done">',
      '  <div class="fabricvton-done-mark">' + ICONS.check + '</div>',
      '  <h2>All set!</h2>',
      '  <p class="fabricvton-lead" data-role="done-lead">Added to your cart. Shop the look, or try another photo.</p>',
      '  <div class="fabricvton-stack">',
      '    <button type="button" class="fabricvton-primary" data-action="view-cart">View cart</button>',
      '    <button type="button" class="fabricvton-secondary" data-action="reset">Try another photo</button>',
      '  </div>',
      '</div>',

      '<div class="fabricvton-step fabricvton-error" data-step="error">',
      '  <p class="fabricvton-error-icon">&#128533;</p>',
      '  <p class="fabricvton-error-msg" data-role="error-msg">Something went wrong.</p>',
      '  <button type="button" class="fabricvton-primary" data-role="error-action" data-action="reset">Try again</button>',
      '</div>'
    ].join("");

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    els = {
      backdrop: backdrop,
      dialog: dialog,
      email: dialog.querySelector("#fabricvton-email"),
      emailError: dialog.querySelector('[data-role="email-error"]'),
      uploadLead: dialog.querySelector('[data-role="upload-lead"]'),
      file: dialog.querySelector('[data-role="file"]'),
      cameraFile: dialog.querySelector('[data-role="camera-file"]'),
      preview: dialog.querySelector('[data-role="preview"]'),
      generate: dialog.querySelector('[data-action="generate"]'),
      consent: dialog.querySelector('[data-role="consent"]'),
      consentText: dialog.querySelector('[data-role="consent-text"]'),
      dropzone: dialog.querySelector('[data-action="pick"]'),
      arc: dialog.querySelector('[data-role="arc"]'),
      stages: dialog.querySelectorAll('[data-role="stages"] li'),
      almost: dialog.querySelector('[data-role="almost"]'),
      result: dialog.querySelector('[data-role="result"]'),
      compare: dialog.querySelector('[data-role="compare"]'),
      compareResult: dialog.querySelector('[data-role="compare-result"]'),
      compareOriginal: dialog.querySelector('[data-role="compare-original"]'),
      compareTop: dialog.querySelector('[data-role="compare-top"]'),
      compareLine: dialog.querySelector('[data-role="compare-line"]'),
      compareRange: dialog.querySelector('[data-role="compare-range"]'),
      compareToggle: dialog.querySelector('[data-action="compare"]'),
      addToCart: dialog.querySelector('[data-action="add-to-cart"]'),
      doneLead: dialog.querySelector('[data-role="done-lead"]'),
      errorMsg: dialog.querySelector('[data-role="error-msg"]'),
      errorAction: dialog.querySelector('[data-role="error-action"]')
    };

    els.arc.style.strokeDasharray = RING;
    setProgress(0.08);

    backdrop.addEventListener("click", close);
    dialog.addEventListener("click", onDialogClick);
    els.file.addEventListener("change", function () { onFileSelected(els.file); });
    els.cameraFile.addEventListener("change", function () { onFileSelected(els.cameraFile); });
    els.consent.addEventListener("change", function () {
      els.generate.disabled = !els.consent.checked;
    });
    els.compareRange.addEventListener("input", function () {
      setComparePosition(Number(els.compareRange.value));
    });
    window.addEventListener("resize", function () {
      if (els.compare.style.display !== "none") sizeCompareOverlay();
    });

    // Enter/Space on the dropzone, which is a div so that dragging works.
    els.dropzone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        els.file.click();
      }
    });
    ["dragenter", "dragover"].forEach(function (name) {
      els.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        els.dropzone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      els.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        els.dropzone.classList.remove("is-dragover");
      });
    });
    els.dropzone.addEventListener("drop", function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) acceptFile(file);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dialog.style.display === "block") close();
    });

    modal = dialog;
  }

  function onDialogClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var trigger = target.closest("[data-action]");
    if (!trigger) return;

    var action = trigger.getAttribute("data-action");
    if (action === "close") close();
    else if (action === "continue") proceedToUpload();
    else if (action === "pick") els.file.click();
    else if (action === "camera") els.cameraFile.click();
    else if (action === "generate") generate();
    else if (action === "change") backToUpload();
    else if (action === "compare") toggleCompare();
    else if (action === "add-to-cart") addToCart();
    else if (action === "view-cart") viewCart();
    else if (action === "reset") reset();
  }

  // ── Step handling ────────────────────────────────────────

  function showStep(step) {
    var steps = modal.querySelectorAll(".fabricvton-step");
    for (var i = 0; i < steps.length; i++) {
      steps[i].setAttribute(
        "data-active",
        steps[i].getAttribute("data-step") === step ? "true" : "false"
      );
    }
    // Every step is a different height; starting a tall one half-scrolled
    // from the previous step looks broken.
    modal.scrollTop = 0;
  }

  function showError(message) {
    els.errorMsg.textContent = message;
    els.errorAction.textContent = "Try again";
    els.errorAction.setAttribute("data-action", "reset");
    showStep("error");
  }

  // ── Progress ring and stage list ─────────────────────────

  function setProgress(fraction) {
    els.arc.style.strokeDashoffset = RING * (1 - fraction);
  }

  /** Marks every stage before `index` done, `index` active, the rest idle. */
  function setStage(index, fraction) {
    for (var i = 0; i < els.stages.length; i++) {
      els.stages[i].setAttribute(
        "data-state",
        i < index ? "done" : i === index ? "active" : "idle"
      );
    }
    setProgress(fraction);
  }

  function finishStages() {
    for (var i = 0; i < els.stages.length; i++) {
      els.stages[i].setAttribute("data-state", "done");
    }
    setProgress(1);
  }

  // ── Compare slider ───────────────────────────────────────

  /**
   * Pins the clipped overlay to the width of the whole compare box. Without
   * this it would shrink with its clip and the two images would drift apart.
   */
  function sizeCompareOverlay() {
    els.compareOriginal.style.width = els.compare.clientWidth + "px";
  }

  function setComparePosition(percent) {
    els.compareTop.style.width = percent + "%";
    els.compareLine.style.left = percent + "%";
  }

  function toggleCompare() {
    var showing = els.compare.style.display !== "none";
    if (showing) {
      els.compare.style.display = "none";
      els.result.style.display = "block";
      els.compareToggle.setAttribute("aria-pressed", "false");
      return;
    }
    els.result.style.display = "none";
    els.compare.style.display = "block";
    els.compareToggle.setAttribute("aria-pressed", "true");
    els.compareRange.value = 50;
    setComparePosition(50);
    sizeCompareOverlay();
  }

  // ── Cart ─────────────────────────────────────────────────

  /**
   * The variant the shopper has actually selected, read from the theme's own
   * product form at click time — a variant chosen after page load would make
   * anything captured when the button rendered the wrong one.
   */
  function selectedVariantId() {
    var input = document.querySelector('form[action*="/cart/add"] [name="id"]');
    if (input && input.value) return input.value;
    return ctx && ctx.variantId ? ctx.variantId : "";
  }

  function cartUnavailable() {
    els.errorMsg.textContent =
      "We couldn\u2019t add this to your cart from here. Close this window and use the Add to cart button on the page.";
    els.errorAction.textContent = "Back to the product";
    els.errorAction.setAttribute("data-action", "close");
    showStep("error");
  }

  function addToCart() {
    var variantId = selectedVariantId();
    if (!variantId) return cartUnavailable();

    els.addToCart.disabled = true;
    fetch((ctx.cartAddUrl || "/cart/add.js"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("cart rejected the item");
        return res.json();
      })
      .then(function () {
        els.addToCart.disabled = false;
        showStep("done");
      })
      .catch(function () {
        els.addToCart.disabled = false;
        cartUnavailable();
      });
  }

  function viewCart() {
    window.location.href = ctx && ctx.cartUrl ? ctx.cartUrl : "/cart";
  }

  // ── Opening, closing, resetting ──────────────────────────

  function open(config) {
    if (!modal) buildModal();
    ctx = config;
    selectedFile = null;
    capturedEmail = "";
    originalDataUrl = "";

    els.uploadLead.textContent =
      "Upload a photo and try " + config.productTitle + " on virtually.";
    els.consentText.textContent = config.requireEmail
      ? "I am 18 or older (or have my guardian\u2019s consent), and I agree that my photo and the email address I entered may be processed to create this try-on."
      : "I am 18 or older (or have my guardian\u2019s consent), and I agree that my photo may be processed to create this try-on.";
    resetPhotoState();
    els.emailError.style.display = "none";
    els.email.value = "";

    els.backdrop.style.display = "block";
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    showStep(config.requireEmail ? "email" : "upload");

    // Fire-and-forget analytics ping.
    fetch(
      config.backendUrl + "/api/tryon?event=open&shop=" + encodeURIComponent(config.shop),
      { method: "GET", keepalive: true }
    ).catch(function () {});
  }

  function close() {
    if (!modal) return;
    els.backdrop.style.display = "none";
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  /** Clears the chosen photo and everything derived from it. */
  function resetPhotoState() {
    selectedFile = null;
    originalDataUrl = "";
    els.file.value = "";
    els.cameraFile.value = "";
    els.consent.checked = false;
    els.generate.disabled = true;
    els.addToCart.disabled = false;
    els.compare.style.display = "none";
    els.result.style.display = "block";
    els.compareToggle.setAttribute("aria-pressed", "false");
    els.almost.style.visibility = "hidden";
    setStage(0, 0.08);
  }

  function reset() {
    resetPhotoState();
    showStep(ctx && ctx.requireEmail && !capturedEmail ? "email" : "upload");
  }

  function backToUpload() {
    resetPhotoState();
    showStep("upload");
  }

  function proceedToUpload() {
    var value = (els.email.value || "").trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      els.emailError.style.display = "block";
      return;
    }
    els.emailError.style.display = "none";
    capturedEmail = value;
    showStep("upload");
  }

  function onFileSelected(input) {
    var file = input.files && input.files[0];
    if (file) acceptFile(file);
  }

  /** Shared by the file input, the camera input and drag-and-drop. */
  function acceptFile(file) {
    if (file.size > MAX_UPLOAD_BYTES) {
      showError("That photo is larger than 10MB. Please choose a smaller image.");
      return;
    }
    if (file.type && file.type.indexOf("image/") !== 0) {
      showError("That file isn\u2019t an image. Please choose a JPG or PNG.");
      return;
    }

    selectedFile = file;
    var reader = new FileReader();
    reader.onerror = function () {
      showError("That photo could not be read. Please try another image.");
    };
    reader.onload = function (event) {
      originalDataUrl = event.target.result;
      els.preview.src = originalDataUrl;
      els.consent.checked = false;
      els.generate.disabled = true;
      showStep("confirm");
    };
    reader.readAsDataURL(file);
  }

  // ── Generation ───────────────────────────────────────────

  function compress(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var width = img.width;
        var height = img.height;

        if (width > height && width > MAX_IMAGE_EDGE) {
          height *= MAX_IMAGE_EDGE / width;
          width = MAX_IMAGE_EDGE;
        } else if (height >= width && height > MAX_IMAGE_EDGE) {
          width *= MAX_IMAGE_EDGE / height;
          height = MAX_IMAGE_EDGE;
        }

        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () {
        reject(new Error("Failed to read image."));
      };
      img.src = dataUrl;
    });
  }

  function messageForStatus(status, serverMessage) {
    if (status === 402) {
      return "Try-on credits have run out for this store. Please contact the store owner.";
    }
    if (status === 429) {
      return serverMessage || "Too many requests. Please wait a moment and try again.";
    }
    if (status === 403) {
      return "Virtual Try-On is currently disabled for this store.";
    }
    if (status === 413) {
      return serverMessage || "That photo is too large. Please choose a smaller image.";
    }
    if (status === 422 || status === 415) {
      return serverMessage || "That photo can't be used. Please try a clear JPG or PNG.";
    }
    if (status >= 500) {
      return "Our server encountered an error. Please try again in a moment.";
    }
    return serverMessage || "Failed to create try-on generation.";
  }

  function generate() {
    if (!selectedFile) return;
    // Belt and braces: the button is disabled without consent, but never send
    // a photo unless the box is actually ticked.
    if (!els.consent || !els.consent.checked) return;
    showStep("loading");
    setStage(0, 0.12);
    els.almost.style.visibility = "hidden";

    var reader = new FileReader();
    reader.onerror = function () {
      showError("That photo could not be read. Please try another image.");
    };
    reader.onload = function (event) {
      compress(event.target.result)
        .then(function (compressed) {
          return fetch(
            ctx.backendUrl + "/api/tryon?cb=" + ctx.version + "&oseid=" + sessionId,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shop: ctx.shop,
                productId: ctx.productId,
                productTitle: ctx.productTitle,
                productImageUrl: ctx.productImageUrl,
                sessionId: sessionId,
                personImageDataUrl: compressed,
                personImageMimeType: "image/jpeg",
                email: capturedEmail || "",
                consentVersion: CONSENT_VERSION,
                consentAt: new Date().toISOString()
              })
            }
          );
        })
        .then(function (res) {
          return parseJsonSafely(res).then(function (data) {
            if (!res.ok) {
              var message = messageForStatus(
                res.status,
                data.error || data.message || ""
              );
              // The backend no longer returns provider error details, only a
              // correlation id. Showing it gives the shopper something concrete
              // to quote to support, which the old `debug` blob was standing in for.
              if (data.requestId && res.status >= 500) {
                message += " (ref: " + data.requestId + ")";
              }
              throw new Error(message);
            }
            return data;
          });
        })
        .then(function (data) {
          if (!data.generationId) throw new Error("Missing generationId.");
          // The photo is uploaded and accepted: first stage genuinely done.
          setStage(1, 0.4);
          poll(data.generationId, 0);
        })
        .catch(function (err) {
          showError(err.message || "Network error. Please try again.");
        });
    };
    reader.readAsDataURL(selectedFile);
  }

  function showResult(url) {
    finishStages();
    els.result.src = url;
    els.compareResult.src = url;
    els.compareOriginal.src = originalDataUrl;
    els.compare.style.display = "none";
    els.result.style.display = "block";
    els.compareToggle.setAttribute("aria-pressed", "false");
    showStep("result");
  }

  function poll(generationId, attempt) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      showError("This is taking longer than expected. Please try again.");
      return;
    }

    // One poll in, the provider has the job: stop claiming we are still
    // preparing the outfit. After a while, say so rather than sit silent.
    if (attempt === 1) setStage(2, 0.62);
    if (attempt >= 2) setProgress(Math.min(0.92, 0.62 + attempt * 0.03));
    if (attempt >= 6) els.almost.style.visibility = "visible";

    setTimeout(function () {
      fetch(
        ctx.backendUrl +
          "/api/tryon?generationId=" +
          encodeURIComponent(generationId) +
          // Lets the backend rate-limit polling per shopper rather than lumping
          // every visitor on the store into one shared bucket.
          "&sessionId=" +
          encodeURIComponent(sessionId),
        { method: "GET" }
      )
        .then(function (res) {
          return parseJsonSafely(res).then(function (data) {
            if (!res.ok) {
              throw new Error(
                data.error || data.message || "Failed to check generation status."
              );
            }
            return data;
          });
        })
        .then(function (data) {
          if (data.status === "COMPLETED" && data.resultImageUrl) {
            showResult(data.resultImageUrl);
          } else if (data.status === "FAILED") {
            showError(data.errorMessage || "The try-on failed. Please try another photo.");
          } else {
            poll(generationId, attempt + 1);
          }
        })
        .catch(function (err) {
          showError(err.message || "Could not check the try-on status.");
        });
    }, POLL_INTERVAL_MS);
  }

  // ── Delegated launch ─────────────────────────────────────
  // Delegation means any number of blocks on the page work, and blocks injected
  // later (section rendering API, theme editor) need no re-initialisation.

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-fabricvton-button]");
    if (!button) return;

    event.preventDefault();
    var config = {
      shop: button.getAttribute("data-shop") || "",
      backendUrl: button.getAttribute("data-backend-url") || "",
      productId: button.getAttribute("data-product-id") || "",
      productTitle: button.getAttribute("data-product-title") || "this product",
      productImageUrl: button.getAttribute("data-product-image") || "",
      requireEmail: button.getAttribute("data-require-email") === "true",
      version: button.getAttribute("data-version") || "",
      // Cart routes come from the theme via Liquid, so markets and locale
      // prefixes (/en-gb/cart/add.js) are respected instead of assumed.
      cartAddUrl: button.getAttribute("data-cart-add-url") || "",
      cartUrl: button.getAttribute("data-cart-url") || "",
      variantId: button.getAttribute("data-variant-id") || ""
    };
    // Opened only once the modal's stylesheet is in, so the first open never
    // flashes unstyled markup.
    loadStyles(button.getAttribute("data-css-url")).then(function () {
      open(config);
    });
  });
})();
