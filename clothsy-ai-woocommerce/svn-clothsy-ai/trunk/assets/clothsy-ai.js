/*
 * Clothsy AI try-on widget for WooCommerce.
 *
 * Loaded with `defer` only on pages that show a try-on button. The modal DOM
 * and its stylesheet are fetched on first interaction, so a product page that
 * nobody interacts with pays for this one script and nothing that blocks
 * rendering.
 *
 * Flow: ask this WordPress site for a short-lived try-on token for the product
 * (and selected variation), then send the photo straight to Clothsy AI with
 * that token and poll for the result. The photo never passes through the
 * store's own server, which keeps try-on fast on shared hosting.
 */
(function () {
  "use strict";

  if (window.__clothsyAIReady) return;
  window.__clothsyAIReady = true;

  var MAX_POLL_ATTEMPTS = 60; // 60 x 3s = 3 minutes
  var POLL_INTERVAL_MS = 3000;
  // Wording of the consent shown to the shopper. Bump this whenever the text
  // changes, so a stored consent record always points at what was agreed to.
  var CONSENT_VERSION = "2026-09-20.v1";
  var PRIVACY_URL = "https://www.fabricvton.com/widget-privacy";
  var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  var MAX_IMAGE_EDGE = 1024;

  var modal = null;
  var els = {};
  var ctx = null; // the button that opened the modal
  var session = null; // { token, apiBase, expiresAt, key }
  var selectedFile = null;
  var capturedEmail = "";
  // The photo as the shopper sees it, kept so the result can be compared
  // against it without reading the file a second time.
  var originalDataUrl = "";
  // The button that opened the modal, so the shopper's chosen variation can be
  // read from the form around it when adding to the cart.
  var lastButton = null;

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

  // ── Anonymous per-tab session id ─────────────────────────
  // Clothsy AI rate-limits per session id and accepts [A-Za-z0-9_-]{4,64}; two
  // draws are concatenated because a single Math.random() string can be only a
  // character or two long.
  function newSessionId() {
    return (
      Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
    ).replace(/[^a-z0-9]/g, "") + "0000";
  }

  var sessionId = "";
  try {
    sessionId = sessionStorage.getItem("clothsy_ai_sid") || "";
    if (!sessionId) {
      sessionId = newSessionId();
      sessionStorage.setItem("clothsy_ai_sid", sessionId);
    }
  } catch (e) {
    sessionId = newSessionId();
  }

  function parseJsonSafely(res) {
    return res.text().then(function (text) {
      try {
        return text ? JSON.parse(text) : {};
      } catch (err) {
        return { error: "Unexpected response (" + res.status + ")." };
      }
    });
  }

  // ── Stylesheet on first intent ───────────────────────────

  var stylesPromise = null;

  function loadStyles(url) {
    if (stylesPromise) return stylesPromise;
    stylesPromise = new Promise(function (resolve) {
      if (!url) return resolve();
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      // A slow or failed stylesheet never blocks opening the modal.
      link.onload = resolve;
      link.onerror = resolve;
      setTimeout(resolve, 3000);
      document.head.appendChild(link);
    });
    return stylesPromise;
  }

  function warmStyles(event) {
    var button = event.target.closest && event.target.closest("[data-clothsy-ai-button]");
    if (button) loadStyles(button.getAttribute("data-css-url"));
  }

  document.addEventListener("pointerover", warmStyles, { passive: true });
  document.addEventListener("focusin", warmStyles);

  // ── Try-on token from this WordPress site ────────────────

  // Variable products: the selected variation decides which image is tried on.
  function selectedVariationId(button, productId) {
    var form =
      button.closest("form.variations_form") ||
      document.querySelector('form.variations_form[data-product_id="' + productId + '"]');
    var input = form && form.querySelector('input[name="variation_id"]');
    var value = input ? parseInt(input.value, 10) : 0;
    return value > 0 ? value : 0;
  }

  function requestToken(config) {
    var body = { product_id: parseInt(config.productId, 10), variation_id: config.variationId };

    function viaRest() {
      return fetch(config.sessionUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    // Some security plugins block the REST API for logged-out visitors;
    // admin-ajax.php is the WordPress endpoint they leave open.
    function viaAjax() {
      var form = new FormData();
      form.append("action", "clothsy_ai_session");
      form.append("product_id", String(body.product_id));
      form.append("variation_id", String(body.variation_id));
      return fetch(config.ajaxUrl, { method: "POST", credentials: "same-origin", body: form });
    }

    function read(res) {
      return parseJsonSafely(res).then(function (data) {
        if (!res.ok || !data.token) {
          var error = new Error(data.message || data.error || "Virtual try-on is not available right now.");
          error.status = res.status;
          throw error;
        }
        return data;
      });
    }

    return viaRest()
      .then(read)
      .catch(function (err) {
        // Our own "not available" answers are final; anything else (REST
        // blocked, 401/403 from a firewall, network) gets one retry via ajax.
        if (err.status === 404 || err.status === 422 || err.status === 503) throw err;
        return viaAjax().then(read);
      })
      .then(function (data) {
        session = {
          token: data.token,
          apiBase: data.apiBase,
          // Refresh a minute early so a slow upload can't outlive its token.
          expiresAt: Date.now() + (data.expiresIn - 60) * 1000,
          key: config.productId + ":" + config.variationId
        };
        return session;
      });
  }

  function ensureToken(config) {
    var key = config.productId + ":" + config.variationId;
    if (session && session.key === key && Date.now() < session.expiresAt) {
      return Promise.resolve(session);
    }
    return requestToken(config);
  }

  // ── Modal ─────────────────────────────────────────────────

  function buildModal() {
    var backdrop = document.createElement("div");
    backdrop.className = "clothsy-ai-backdrop";
    backdrop.style.display = "none";

    var dialog = document.createElement("div");
    dialog.className = "clothsy-ai-modal";
    dialog.style.display = "none";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Virtual try-on");

    dialog.innerHTML = [
      '<div class="clothsy-ai-bar">',
      '  <span class="clothsy-ai-brand">Clothsy <i>AI</i></span>',
      '  <button type="button" class="clothsy-ai-close" data-action="close" aria-label="Close try-on">&times;</button>',
      '</div>',

      '<div class="clothsy-ai-step" data-step="email">',
      '  <h2>See it on you.</h2>',
      '  <p class="clothsy-ai-lead">Enter your email to unlock your personalised virtual try-on.</p>',
      '  <div class="clothsy-ai-stack">',
      '    <label class="clothsy-ai-visually-hidden" for="clothsy-ai-email">Email address</label>',
      '    <input id="clothsy-ai-email" class="clothsy-ai-field" type="email" placeholder="your@email.com" autocomplete="email" />',
      '    <button type="button" class="clothsy-ai-primary" data-action="continue">Continue</button>',
      '    <p class="clothsy-ai-lead" data-role="email-error" style="display:none;color:#d23b3b;margin:0;font-size:13px;">Please enter a valid email address.</p>',
      '  </div>',
      '</div>',

      '<div class="clothsy-ai-step" data-step="upload">',
      '  <h2>See it on you.</h2>',
      '  <p class="clothsy-ai-lead" data-role="upload-lead"></p>',
      '  <div class="clothsy-ai-dropzone" data-action="pick" role="button" tabindex="0">',
      '    ' + ICONS.upload,
      '    <b>Choose a photo</b>',
      '    <span>Drag and drop or click to upload &bull; JPG or PNG, max 10MB</span>',
      '  </div>',
      '  <div class="clothsy-ai-or">or</div>',
      '  <button type="button" class="clothsy-ai-secondary" data-action="camera">' + ICONS.camera + 'Take a photo</button>',
      '  <input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden data-role="file" />',
      '  <input type="file" accept="image/*" capture="user" hidden data-role="camera-file" />',
      '  <p class="clothsy-ai-private">' + ICONS.lock + 'Your photo stays private.</p>',
      '</div>',

      '<div class="clothsy-ai-step" data-step="confirm">',
      '  <h2>Confirm your photo</h2>',
      '  <p class="clothsy-ai-lead">Stand upright, face visible, shoulders down for the best result.</p>',
      '  <img class="clothsy-ai-photo" alt="The photo you chose" data-role="preview" />',
      '  <div class="clothsy-ai-consent">',
      '    <label class="clothsy-ai-consent-row">',
      '      <input type="checkbox" data-role="consent" />',
      '      <span data-role="consent-text"></span>',
      '    </label>',
      '    <p class="clothsy-ai-consent-note">Your photo is used only to create this try-on and is not stored. You can withdraw consent or ask for your data to be deleted at any time &mdash; see the <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">privacy notice</a>.</p>',
      '  </div>',
      '  <div class="clothsy-ai-stack">',
      '    <button type="button" class="clothsy-ai-primary" data-action="generate" disabled>Continue</button>',
      '    <button type="button" class="clothsy-ai-secondary" data-action="change">Change photo</button>',
      '  </div>',
      '</div>',

      '<div class="clothsy-ai-step clothsy-ai-loading" data-step="loading">',
      '  <h2>Creating your try-on&hellip;</h2>',
      '  <p class="clothsy-ai-lead">This usually takes a few seconds.</p>',
      '  <svg class="clothsy-ai-ring" viewBox="0 0 100 100" role="status" aria-live="polite" aria-label="Creating your try-on">',
      '    <circle class="ca-track" cx="50" cy="50" r="46"></circle>',
      '    <circle class="ca-arc" cx="50" cy="50" r="46" data-role="arc"></circle>',
      '  </svg>',
      '  <ul class="clothsy-ai-steps" data-role="stages">',
      '    <li data-state="active"><b></b>Analysing your photo</li>',
      '    <li data-state="idle"><b></b>Preparing the outfit</li>',
      '    <li data-state="idle"><b></b>Generating your look</li>',
      '  </ul>',
      '  <p class="clothsy-ai-almost" data-role="almost" style="visibility:hidden;">Almost there&hellip;</p>',
      '</div>',

      '<div class="clothsy-ai-step" data-step="result">',
      '  <h2>Your try-on</h2>',
      '  <img class="clothsy-ai-result-img" alt="Virtual try-on result" data-role="result" />',
      '  <div class="clothsy-ai-compare" data-role="compare" style="display:none;">',
      '    <img alt="Virtual try-on result" data-role="compare-result" />',
      '    <div class="clothsy-ai-compare-top" data-role="compare-top">',
      '      <img alt="Your original photo" data-role="compare-original" />',
      '    </div>',
      '    <div class="clothsy-ai-compare-line" data-role="compare-line"><span class="clothsy-ai-compare-grip">' + ICONS.grip + '</span></div>',
      '    <span class="clothsy-ai-tag clothsy-ai-tag-before">Original</span>',
      '    <span class="clothsy-ai-tag clothsy-ai-tag-after">Try-on</span>',
      '    <input class="clothsy-ai-compare-range" type="range" min="0" max="100" value="50" data-role="compare-range" aria-label="Compare your photo with the try-on" />',
      '  </div>',
      '  <div class="clothsy-ai-center">',
      '    <button type="button" class="clothsy-ai-toggle" data-action="compare" aria-pressed="false">' + ICONS.compare + 'Compare</button>',
      '  </div>',
      '  <div class="clothsy-ai-actions">',
      '    <button type="button" class="clothsy-ai-secondary" data-action="reset">Try another photo</button>',
      '    <button type="button" class="clothsy-ai-primary" data-action="add-to-cart" style="flex:1.2;">' + ICONS.cart + 'Add to cart</button>',
      '  </div>',
      '  <p class="clothsy-ai-disclaimer">Images are generated in real time and are not stored.</p>',
      '</div>',

      '<div class="clothsy-ai-step clothsy-ai-done" data-step="done">',
      '  <div class="clothsy-ai-done-mark">' + ICONS.check + '</div>',
      '  <h2>All set!</h2>',
      '  <p class="clothsy-ai-lead" data-role="done-lead">Added to your cart. Shop the look, or try another photo.</p>',
      '  <div class="clothsy-ai-stack">',
      '    <button type="button" class="clothsy-ai-primary" data-action="view-cart">View cart</button>',
      '    <button type="button" class="clothsy-ai-secondary" data-action="reset">Try another photo</button>',
      '  </div>',
      '</div>',

      '<div class="clothsy-ai-step clothsy-ai-error" data-step="error">',
      '  <p class="clothsy-ai-error-icon">&#128533;</p>',
      '  <p class="clothsy-ai-error-msg" data-role="error-msg">Something went wrong.</p>',
      '  <button type="button" class="clothsy-ai-primary" data-role="error-action" data-action="reset">Try again</button>',
      '</div>'
    ].join("");

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    els = {
      backdrop: backdrop,
      dialog: dialog,
      email: dialog.querySelector("#clothsy-ai-email"),
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
    var steps = modal.querySelectorAll(".clothsy-ai-step");
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

  function cartUnavailable() {
    els.errorMsg.textContent =
      "We couldn\u2019t add this to your cart from here. Close this window and use the Add to cart button on the page.";
    els.errorAction.textContent = "Back to the product";
    els.errorAction.setAttribute("data-action", "close");
    showStep("error");
  }

  function addToCart() {
    if (!ctx || !ctx.cartAddUrl || !ctx.productId) return cartUnavailable();

    // WooCommerce's own add-to-cart endpoint, so stock checks, variations and
    // cart plugins behave exactly as they do for the theme's button.
    var form = new FormData();
    form.append("product_id", ctx.productId);
    form.append("quantity", "1");
    var variationId = lastButton ? selectedVariationId(lastButton, ctx.productId) : 0;
    if (variationId) form.append("variation_id", variationId);

    els.addToCart.disabled = true;
    fetch(ctx.cartAddUrl, { method: "POST", credentials: "same-origin", body: form })
      .then(function (res) {
        return parseJsonSafely(res).then(function (data) {
          // Woo answers 200 with an `error` field when it refuses the item.
          if (!res.ok || (data && data.error)) throw new Error("cart refused");
          return data;
        });
      })
      .then(function () {
        els.addToCart.disabled = false;
        refreshCartFragments();
        showStep("done");
      })
      .catch(function () {
        els.addToCart.disabled = false;
        cartUnavailable();
      });
  }

  /** Nudges the theme's mini-cart to redraw, as Woo's own button does. */
  function refreshCartFragments() {
    if (window.jQuery) {
      try {
        window.jQuery(document.body).trigger("wc_fragment_refresh");
      } catch (e) {
        /* A theme without the fragments script still has the item in the cart. */
      }
    }
  }

  function viewCart() {
    if (ctx && ctx.cartUrl) window.location.href = ctx.cartUrl;
    else close();
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

    // Fetch the token now, while the shopper reads the first step, so that a
    // product that can't be tried on says so immediately.
    ensureToken(config)
      .then(function (s) {
        fetch(s.apiBase + "/api/woo/tryon?event=open", {
          method: "GET",
          headers: { "X-Clothsy-Token": s.token },
          keepalive: true
        }).catch(function () {});
      })
      .catch(function (err) {
        showError(err.message);
      });
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
        reject(new Error("That photo could not be read. Please try another image."));
      };
      img.src = dataUrl;
    });
  }

  function messageForStatus(status, serverMessage) {
    if (status === 429) return serverMessage || "Too many requests. Please wait a moment and try again.";
    if (status === 413) return serverMessage || "That photo is too large. Please choose a smaller image.";
    if (status === 403 || status === 422 || status === 415) {
      return serverMessage || "Virtual try-on isn't available for this product right now.";
    }
    if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
    return serverMessage || "The try-on could not be started.";
  }

  function startGeneration(compressed, allowRetry) {
    return ensureToken(ctx).then(function (s) {
      return fetch(s.apiBase + "/api/woo/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Clothsy-Token": s.token },
        body: JSON.stringify({
          sessionId: sessionId,
          personImageDataUrl: compressed,
          personImageMimeType: "image/jpeg",
          email: capturedEmail || "",
          consentVersion: CONSENT_VERSION,
          consentAt: new Date().toISOString()
        })
      }).then(function (res) {
        return parseJsonSafely(res).then(function (data) {
          // A token that expired while the shopper chose a photo: get a fresh
          // one and resend once.
          if (res.status === 401 && allowRetry) {
            session = null;
            return startGeneration(compressed, false);
          }
          if (!res.ok) {
            var message = messageForStatus(res.status, data.error || "");
            if (data.requestId && res.status >= 500) message += " (ref: " + data.requestId + ")";
            throw new Error(message);
          }
          return data;
        });
      });
    });
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
          return startGeneration(compressed, true);
        })
        .then(function (data) {
          if (!data.generationId) throw new Error("The try-on could not be started.");
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
      ensureToken(ctx)
        .then(function (s) {
          return fetch(
            s.apiBase +
              "/api/woo/tryon?generationId=" + encodeURIComponent(generationId) +
              "&sessionId=" + encodeURIComponent(sessionId),
            { method: "GET", headers: { "X-Clothsy-Token": s.token } }
          );
        })
        .then(function (res) {
          return parseJsonSafely(res).then(function (data) {
            if (!res.ok) throw new Error(data.error || "Could not check the try-on status.");
            return data;
          });
        })
        .then(function (data) {
          if (data.status === "COMPLETED" && data.resultImageUrl) {
            showResult(data.resultImageUrl);
          } else if (data.status === "FAILED") {
            showError(data.errorMessage || "The try-on failed. Please try again with another photo.");
          } else {
            poll(generationId, attempt + 1);
          }
        })
        .catch(function (err) {
          showError(err.message || "Could not check the try-on status.");
        });
    }, POLL_INTERVAL_MS);
  }

  // ── Launch (delegated, so any number of buttons work) ────

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("[data-clothsy-ai-button]");
    if (!button) return;
    event.preventDefault();

    var productId = button.getAttribute("data-product-id") || "";
    var config = {
      productId: productId,
      variationId: selectedVariationId(button, productId),
      productTitle: button.getAttribute("data-product-title") || "this product",
      requireEmail: button.getAttribute("data-require-email") === "true",
      sessionUrl: button.getAttribute("data-session-url") || "",
      ajaxUrl: button.getAttribute("data-ajax-url") || "",
      cartAddUrl: button.getAttribute("data-cart-add-url") || "",
      cartUrl: button.getAttribute("data-cart-url") || ""
    };
    lastButton = button;
    loadStyles(button.getAttribute("data-css-url")).then(function () {
      open(config);
    });
  });
})();
