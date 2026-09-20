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
  var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  var MAX_IMAGE_EDGE = 1024;

  var modal = null;
  var els = {};
  var ctx = null; // the button that opened the modal
  var session = null; // { token, apiBase, expiresAt, key }
  var selectedFile = null;
  var capturedEmail = "";

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
      '<button type="button" class="clothsy-ai-close" data-action="close" aria-label="Close try-on">&times;</button>',

      '<div class="clothsy-ai-step" data-step="email">',
      "  <h2>Virtual Try-On</h2>",
      '  <p class="clothsy-ai-lead">Enter your email to unlock your personalized virtual try-on.</p>',
      '  <div class="clothsy-ai-stack">',
      '    <label class="clothsy-ai-visually-hidden" for="clothsy-ai-email">Email address</label>',
      '    <input id="clothsy-ai-email" class="clothsy-ai-field" type="email" placeholder="your@email.com" autocomplete="email" />',
      '    <button type="button" class="clothsy-ai-primary" data-action="continue">Continue</button>',
      '    <p class="clothsy-ai-lead" data-role="email-error" style="display:none;color:#e53e3e;margin:0;font-size:13px;">Please enter a valid email address.</p>',
      "  </div>",
      "</div>",

      '<div class="clothsy-ai-step" data-step="upload">',
      "  <h2>Upload Your Photo</h2>",
      '  <p class="clothsy-ai-lead" data-role="upload-lead" style="margin-bottom:8px;"></p>',
      '  <ul class="clothsy-ai-hint">',
      "    <li>Just you in the shot &mdash; face fully visible</li>",
      "    <li>Stand upright, facing the camera</li>",
      "    <li>Fill most of the frame, shoulders down</li>",
      "  </ul>",
      '  <div class="clothsy-ai-dropzone" data-action="pick">',
      "    <p>Tap to upload, or drag a photo here</p>",
      "    <p>JPG or PNG &bull; Max 10MB</p>",
      "  </div>",
      '  <input type="file" accept="image/jpeg,image/png" hidden data-role="file" />',
      '  <img class="clothsy-ai-preview" alt="" data-role="preview" />',
      '  <button type="button" class="clothsy-ai-primary clothsy-ai-generate" data-action="generate">Generate Try-On</button>',
      "</div>",

      '<div class="clothsy-ai-step clothsy-ai-loading" data-step="loading">',
      '  <div class="clothsy-ai-spinner" role="status" aria-live="polite"></div>',
      '  <p style="font-size:16px;font-weight:600;">Generating your look&hellip;</p>',
      '  <p style="font-size:13px;color:#999;margin:4px 0 0;">This takes about 20-30 seconds</p>',
      "</div>",

      '<div class="clothsy-ai-step" data-step="result">',
      "  <h2>Your Virtual Try-On</h2>",
      '  <img class="clothsy-ai-result-img" alt="Virtual try-on result" data-role="result" />',
      '  <div class="clothsy-ai-actions">',
      '    <button type="button" class="clothsy-ai-secondary" data-action="reset">Try Again</button>',
      '    <button type="button" class="clothsy-ai-primary" data-action="close" style="flex:1;">Shop Now</button>',
      "  </div>",
      '  <p class="clothsy-ai-disclaimer">Images are processed in real-time and not stored.</p>',
      "</div>",

      '<div class="clothsy-ai-step clothsy-ai-error" data-step="error">',
      '  <p class="clothsy-ai-error-icon">&#128533;</p>',
      '  <p class="clothsy-ai-error-msg" data-role="error-msg">Something went wrong.</p>',
      '  <button type="button" class="clothsy-ai-primary" data-action="reset" style="margin-top:16px;width:auto;padding:12px 24px;">Try Again</button>',
      "</div>"
    ].join("");

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    els = {
      backdrop: backdrop,
      email: dialog.querySelector("#clothsy-ai-email"),
      emailError: dialog.querySelector('[data-role="email-error"]'),
      uploadLead: dialog.querySelector('[data-role="upload-lead"]'),
      file: dialog.querySelector('[data-role="file"]'),
      preview: dialog.querySelector('[data-role="preview"]'),
      generate: dialog.querySelector('[data-action="generate"]'),
      dropzone: dialog.querySelector('[data-action="pick"]'),
      result: dialog.querySelector('[data-role="result"]'),
      errorMsg: dialog.querySelector('[data-role="error-msg"]')
    };

    backdrop.addEventListener("click", close);
    dialog.addEventListener("click", onDialogClick);
    els.file.addEventListener("change", onFileSelected);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dialog.style.display === "block") close();
    });

    modal = dialog;
  }

  function onDialogClick(event) {
    var trigger = event.target && event.target.closest && event.target.closest("[data-action]");
    if (!trigger) return;
    var action = trigger.getAttribute("data-action");
    if (action === "close") close();
    else if (action === "continue") proceedToUpload();
    else if (action === "pick") els.file.click();
    else if (action === "generate") generate();
    else if (action === "reset") reset();
  }

  function showStep(step) {
    var steps = modal.querySelectorAll(".clothsy-ai-step");
    for (var i = 0; i < steps.length; i++) {
      steps[i].setAttribute("data-active", steps[i].getAttribute("data-step") === step ? "true" : "false");
    }
  }

  function showError(message) {
    els.errorMsg.textContent = message;
    showStep("error");
  }

  function open(config) {
    if (!modal) buildModal();
    ctx = config;
    selectedFile = null;
    capturedEmail = "";

    els.uploadLead.textContent = "Upload a photo to see how " + config.productTitle + " looks on you.";
    els.file.value = "";
    els.preview.style.display = "none";
    els.generate.style.display = "none";
    els.dropzone.style.display = "block";
    els.emailError.style.display = "none";

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

  function reset() {
    selectedFile = null;
    els.file.value = "";
    els.preview.style.display = "none";
    els.generate.style.display = "none";
    els.dropzone.style.display = "block";
    showStep(ctx && ctx.requireEmail ? "email" : "upload");
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

  function onFileSelected() {
    var file = els.file.files && els.file.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      showError("That photo is larger than 10MB. Please choose a smaller image.");
      return;
    }
    selectedFile = file;
    var reader = new FileReader();
    reader.onload = function (event) {
      els.preview.src = event.target.result;
      els.preview.style.display = "block";
      els.generate.style.display = "block";
      els.dropzone.style.display = "none";
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
          email: capturedEmail || ""
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
    showStep("loading");
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
          poll(data.generationId, 0);
        })
        .catch(function (err) {
          showError(err.message || "Network error. Please try again.");
        });
    };
    reader.readAsDataURL(selectedFile);
  }

  function poll(generationId, attempt) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      showError("This is taking longer than expected. Please try again.");
      return;
    }
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
            els.result.src = data.resultImageUrl;
            showStep("result");
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
      ajaxUrl: button.getAttribute("data-ajax-url") || ""
    };
    loadStyles(button.getAttribute("data-css-url")).then(function () {
      open(config);
    });
  });
})();
