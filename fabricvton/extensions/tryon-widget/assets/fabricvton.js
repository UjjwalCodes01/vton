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
  var MAX_IMAGE_EDGE = 1024;

  var modal = null; // built on first open
  var els = {};
  var ctx = null; // config of the button that opened the modal
  var selectedFile = null;
  var capturedEmail = "";

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
      '<button type="button" class="fabricvton-close" data-action="close" aria-label="Close try-on">&times;</button>',

      '<div class="fabricvton-step" data-step="email">',
      '  <h2>Virtual Try-On</h2>',
      '  <p class="fabricvton-lead">Enter your email to unlock your personalized virtual try-on experience.</p>',
      '  <div class="fabricvton-stack">',
      '    <label class="fabricvton-visually-hidden" for="fabricvton-email">Email address</label>',
      '    <input id="fabricvton-email" class="fabricvton-field" type="email" placeholder="your@email.com" autocomplete="email" />',
      '    <button type="button" class="fabricvton-primary" data-action="continue">Continue</button>',
      '    <p class="fabricvton-lead" data-role="email-error" style="display:none;color:#e53e3e;margin:0;font-size:13px;">Please enter a valid email address.</p>',
      '  </div>',
      '</div>',

      '<div class="fabricvton-step" data-step="upload">',
      '  <h2>Upload Your Photo</h2>',
      '  <p class="fabricvton-lead" data-role="upload-lead" style="margin-bottom:8px;"></p>',
      '  <ul class="fabricvton-hint">',
      '    <li>Just you in the shot &mdash; face fully visible</li>',
      '    <li>Stand upright, facing the camera</li>',
      '    <li>Fill most of the frame, shoulders down</li>',
      '  </ul>',
      '  <div class="fabricvton-dropzone" data-action="pick">',
      '    <p>Tap to upload, or drag a photo here</p>',
      '    <p>JPG or PNG &bull; Max 10MB</p>',
      '  </div>',
      '  <input type="file" accept="image/jpeg,image/png" hidden data-role="file" />',
      '  <img class="fabricvton-preview" alt="" data-role="preview" />',
      '  <button type="button" class="fabricvton-primary fabricvton-generate" data-action="generate">Generate Try-On</button>',
      '</div>',

      '<div class="fabricvton-step fabricvton-loading" data-step="loading">',
      '  <div class="fabricvton-spinner" role="status" aria-live="polite"></div>',
      '  <p style="font-size:16px;font-weight:600;">Generating your look&hellip;</p>',
      '  <p style="font-size:13px;color:#999;margin:4px 0 0;">This takes about 20-30 seconds</p>',
      '</div>',

      '<div class="fabricvton-step" data-step="result">',
      '  <h2>Your Virtual Try-On</h2>',
      '  <img class="fabricvton-result-img" alt="Virtual try-on result" data-role="result" />',
      '  <div class="fabricvton-actions">',
      '    <button type="button" class="fabricvton-secondary" data-action="reset">Try Again</button>',
      '    <button type="button" class="fabricvton-primary" data-action="close" style="flex:1;">Shop Now</button>',
      '  </div>',
      '  <p class="fabricvton-disclaimer">Images are processed in real-time and not stored.</p>',
      '</div>',

      '<div class="fabricvton-step fabricvton-error" data-step="error">',
      '  <p class="fabricvton-error-icon">&#128533;</p>',
      '  <p class="fabricvton-error-msg" data-role="error-msg">Something went wrong.</p>',
      '  <button type="button" class="fabricvton-primary" data-action="reset" style="margin-top:16px;width:auto;padding:12px 24px;">Try Again</button>',
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
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var trigger = target.closest("[data-action]");
    if (!trigger) return;

    var action = trigger.getAttribute("data-action");
    if (action === "close") close();
    else if (action === "continue") proceedToUpload();
    else if (action === "pick") els.file.click();
    else if (action === "generate") generate();
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
  }

  function open(config) {
    if (!modal) buildModal();
    ctx = config;
    selectedFile = null;
    capturedEmail = "";

    els.uploadLead.textContent =
      "Upload a photo to see how " + config.productTitle + " looks on you.";
    els.file.value = "";
    els.preview.style.display = "none";
    els.generate.style.display = "none";
    els.dropzone.style.display = "block";
    els.emailError.style.display = "none";

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
      els.errorMsg.textContent =
        "That photo is larger than 10MB. Please choose a smaller image.";
      showStep("error");
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
    showStep("loading");

    var reader = new FileReader();
    reader.onerror = function () {
      els.errorMsg.textContent = "Failed to read image.";
      showStep("error");
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
                email: capturedEmail || ""
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
          poll(data.generationId, 0);
        })
        .catch(function (err) {
          els.errorMsg.textContent = err.message || "Network error.";
          showStep("error");
        });
    };
    reader.readAsDataURL(selectedFile);
  }

  function poll(generationId, attempt) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      els.errorMsg.textContent = "Generation timed out. Please try again.";
      showStep("error");
      return;
    }

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
            els.result.src = data.resultImageUrl;
            showStep("result");
          } else if (data.status === "FAILED") {
            els.errorMsg.textContent =
              data.errorMessage || "Generation failed. Please try again.";
            showStep("error");
          } else {
            poll(generationId, attempt + 1);
          }
        })
        .catch(function (err) {
          els.errorMsg.textContent =
            err.message || "Failed while polling generation status.";
          showStep("error");
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
    open({
      shop: button.getAttribute("data-shop") || "",
      backendUrl: button.getAttribute("data-backend-url") || "",
      productId: button.getAttribute("data-product-id") || "",
      productTitle: button.getAttribute("data-product-title") || "this product",
      productImageUrl: button.getAttribute("data-product-image") || "",
      requireEmail: button.getAttribute("data-require-email") === "true",
      version: button.getAttribute("data-version") || ""
    });
  });
})();
