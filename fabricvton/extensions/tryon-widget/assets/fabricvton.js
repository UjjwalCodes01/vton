/*
 * Clothsy AI try-on widget.
 *
 * A panel docked in the bottom-right corner, so the shopper keeps the product
 * page in view while they try the garment on. Loaded once per product page
 * with `defer`; the markup is built on the first click, so a shopper who never
 * opens it pays only for this file.
 *
 * Multiple instances of the block on one page are safe: the script guards
 * against double-initialisation and drives a single shared panel through event
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
  // Wording of the consent shown to the shopper. Bump this whenever the text
  // changes: a stored consent always points at what was actually agreed to,
  // and a bump re-asks everyone who agreed to the old wording.
  var CONSENT_VERSION = "2026-09-22.v2";
  var PRIVACY_URL = "https://www.fabricvton.com/widget-privacy";
  var HISTORY_LIMIT = 12;

  var KEY_CONSENT = "fvton_consent";
  var KEY_EMAIL = "fvton_email";
  var KEY_HISTORY = "fvton_history";

  var panel = null;
  var els = {};
  var ctx = null; // config of the button that opened the panel
  var selectedFile = null;
  var photoDataUrl = ""; // the chosen photo, as the shopper sees it
  var lastResult = null; // { url, title, image, at, generationId }
  var progressTimer = null;

  // ── Storage ──────────────────────────────────────────────
  // Every accessor is guarded: private mode and blocked cookies both throw, and
  // a try-on must still work when they do.

  function readStore(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (e) {
      return "";
    }
  }

  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* Nothing to do: the shopper is simply asked again next time. */
    }
  }

  function readHistory() {
    try {
      var parsed = JSON.parse(readStore(KEY_HISTORY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function rememberTryOn(entry) {
    var list = readHistory();
    list.unshift(entry);
    writeStore(KEY_HISTORY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
  }

  function hasConsent() {
    return readStore(KEY_CONSENT) === CONSENT_VERSION;
  }

  // ── Anonymous per-tab session id ─────────────────────────
  // The backend rate-limits per session id and only accepts [A-Za-z0-9_-]{4,64},
  // so this concatenates two draws: a single Math.random().toString(36) can come
  // out a character or two long, which would fail that check and push the
  // shopper onto a coarser shared bucket.

  function newSessionId() {
    return (
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    ).replace(/[^a-z0-9]/g, "") + "0000";
  }

  var sessionId = "";
  try {
    sessionId = sessionStorage.getItem("fvton_sid") || "";
    if (!sessionId) {
      sessionId = newSessionId();
      sessionStorage.setItem("fvton_sid", sessionId);
    }
  } catch (e) {
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

  function formatDate(iso) {
    var when = new Date(iso);
    if (isNaN(when.getTime())) return "";
    return when.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // ── Stylesheet (fetched on first intent, not on page load) ─

  var stylesPromise = null;

  function loadStyles(url) {
    if (stylesPromise) return stylesPromise;
    stylesPromise = new Promise(function (resolve) {
      if (!url) return resolve();
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      // An unstyled panel is still better than no panel, so a slow or failed
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

  // ── Icons ────────────────────────────────────────────────

  var ICONS = {
    clock:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>',
    close:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
    plus:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    camera:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    sparkle:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 16.5l.8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9z"/></svg>',
    chart:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
    shield:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l7 2.8v5c0 4.3-2.9 8-7 9.2-4.1-1.2-7-4.9-7-9.2v-5z"/></svg>',
    sync:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 0112.8-5.3L20 9"/><path d="M20 4.5V9h-4.5"/><path d="M19.5 12a7.5 7.5 0 01-12.8 5.3L4 15"/><path d="M4 19.5V15h4.5"/></svg>',
    cart:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5h2.2l2.2 10.4a2 2 0 002 1.6h7.4a2 2 0 002-1.55L20.5 8.5H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>',
    share:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15.5V4m0 0L8.5 7.5M12 4l3.5 3.5"/><path d="M5 13v5.5a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V13"/></svg>',
    chevron:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
    up:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10.5v9H4.5v-9zM7 10.5l4.2-7a2 2 0 013 2.4L13 10.5h5.2a2 2 0 011.95 2.45l-1.3 5.6a2 2 0 01-1.95 1.55H7"/></svg>',
    down:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 13.5v-9H4.5v9zM7 13.5l4.2 7a2 2 0 003-2.4L13 13.5h5.2a2 2 0 001.95-2.45l-1.3-5.6A2 2 0 0016.9 3.9H7"/></svg>'
  };

  // ── Panel construction (first open only) ─────────────────

  function buildPanel() {
    var root = document.createElement("div");
    root.className = "fabricvton-panel";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Virtual try-on");
    root.setAttribute("data-open", "false");

    root.innerHTML = [
      '<div class="fabricvton-head">',
      '  <button type="button" class="fabricvton-icon-btn" data-action="back" aria-label="Back" hidden>' + ICONS.back + "</button>",
      '  <div class="fabricvton-head-text">',
      '    <h2 data-role="title">Try It On</h2>',
      '    <p data-role="subtitle">See how it looks on you</p>',
      "  </div>",
      '  <button type="button" class="fabricvton-icon-btn" data-action="history" aria-label="Your try-ons">' + ICONS.clock + "</button>",
      '  <button type="button" class="fabricvton-icon-btn" data-action="close" aria-label="Close try-on">' + ICONS.close + "</button>",
      "</div>",

      '<div class="fabricvton-body">',

      // 1. Intro
      '  <div class="fabricvton-step" data-step="intro">',
      '    <div class="fabricvton-dots"><b data-on="true">1</b><i></i><b data-role="dot2">2</b></div>',
      '    <h3 class="fabricvton-title">Ready to try it on?</h3>',
      '    <p class="fabricvton-sub">Upload your photo and see how it looks on you instantly</p>',
      '    <span class="fabricvton-round" data-role="garment"></span>',
      '    <button type="button" class="fabricvton-btn fabricvton-btn-dark" data-action="pick">' + ICONS.plus + "Choose Your Photo</button>",
      '    <button type="button" class="fabricvton-btn fabricvton-btn-light" data-action="camera">' + ICONS.camera + "Take a photo in a mirror</button>",
      '    <p class="fabricvton-legal">Your photo isn\'t used until you agree to our <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Try-On Privacy Policy</a>.<br>AI can make mistakes.</p>',
      "  </div>",

      // 2. Consent, asked once
      '  <div class="fabricvton-step" data-step="details">',
      '    <span class="fabricvton-square" data-role="details-photo"></span>',
      '    <h3 class="fabricvton-title">Before your first try-on</h3>',
      '    <p class="fabricvton-sub">Here\'s what happens with your photo. We only ask once.</p>',
      '    <ul class="fabricvton-points">',
      "      <li>" + ICONS.sparkle + "<span>Your photo is sent to our secure AI service, only to create your try-on preview. It is never stored.</span></li>",
      "      <li>" + ICONS.chart + "<span>We keep basic usage data, like your number of try-ons, to run this service.</span></li>",
      "      <li>" + ICONS.shield + "<span>You are 18 or older, or have your guardian’s consent. You can withdraw consent at any time.</span></li>",
      "    </ul>",
      '    <div data-role="email-block" style="display:none;">',
      '      <label class="fabricvton-visually-hidden" for="fabricvton-email">Email address</label>',
      '      <input id="fabricvton-email" class="fabricvton-field" type="email" placeholder="your@email.com" autocomplete="email" />',
      '      <p class="fabricvton-field-error" data-role="email-error" style="display:none;">Please enter a valid email address.</p>',
      "    </div>",
      '    <p class="fabricvton-legal" style="margin-top:0;margin-bottom:14px;">By continuing, you agree to the <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Try-On Privacy Policy</a>.</p>',
      '    <button type="button" class="fabricvton-btn fabricvton-btn-dark" data-action="agree">Agree and continue</button>',
      '    <button type="button" class="fabricvton-btn fabricvton-btn-plain" data-action="decline">Not now</button>',
      "  </div>",

      // 3. Preview
      '  <div class="fabricvton-step" data-step="preview">',
      '    <div class="fabricvton-preview-wrap">',
      '      <img alt="The photo you chose" data-role="preview" />',
      '      <button type="button" class="fabricvton-chip" data-action="pick">Change Photo</button>',
      "    </div>",
      '    <button type="button" class="fabricvton-btn fabricvton-btn-dark" data-action="generate">Try It On Now</button>',
      '    <p class="fabricvton-legal">By clicking \'Try It On\', you agree to our <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Try-On Privacy Policy</a>.<br>AI can make mistakes.</p>',
      "  </div>",

      // 4. Generating
      '  <div class="fabricvton-step" data-step="loading">',
      '    <div class="fabricvton-pair">',
      '      <span data-role="pair-garment"></span>',
      "      <i>" + ICONS.sync + "</i>",
      '      <span data-role="pair-photo"></span>',
      "    </div>",
      '    <h3 class="fabricvton-title" data-role="stage" aria-live="polite">Understanding body shape&hellip;</h3>',
      '    <div class="fabricvton-bar"><b data-role="bar"></b></div>',
      '    <p class="fabricvton-pct" data-role="pct">6%</p>',
      '    <div class="fabricvton-tip"><b>TIP</b><span data-role="tip">Use a full body photo for best results</span></div>',
      "  </div>",

      // 5. Result
      '  <div class="fabricvton-step" data-step="result">',
      '    <div class="fabricvton-result"><img alt="Your virtual try-on" data-role="result" /></div>',
      '    <button type="button" class="fabricvton-product" data-action="view-product">',
      '      <span data-role="result-thumb"></span>',
      "      <div><b data-role=\"result-title\"></b><em data-role=\"result-date\"></em></div>",
      "      " + ICONS.chevron,
      "    </button>",
      '    <div class="fabricvton-row">',
      '      <button type="button" class="fabricvton-btn fabricvton-btn-dark" data-action="add-to-cart">' + ICONS.cart + "Add to Cart</button>",
      '      <button type="button" class="fabricvton-btn fabricvton-btn-light" data-action="share">' + ICONS.share + "Share Look</button>",
      "    </div>",
      '    <div class="fabricvton-rate" data-role="rate">',
      "      <p>How realistic is this AI try-on?</p>",
      "      <div>",
      '        <button type="button" data-action="rate" data-rating="up" aria-pressed="false" aria-label="Looks realistic">' + ICONS.up + "</button>",
      '        <button type="button" data-action="rate" data-rating="down" aria-pressed="false" aria-label="Doesn\'t look realistic">' + ICONS.down + "</button>",
      "      </div>",
      "    </div>",
      "  </div>",

      // 6. History
      '  <div class="fabricvton-step fabricvton-history" data-step="history">',
      '    <div data-role="history-list"></div>',
      "  </div>",

      // 7. Error
      '  <div class="fabricvton-step" data-step="error">',
      '    <p class="fabricvton-error-msg" data-role="error-msg">Something went wrong.</p>',
      '    <button type="button" class="fabricvton-btn fabricvton-btn-dark" data-role="error-action" data-action="restart">Try again</button>',
      "  </div>",

      "</div>",

      '<input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden data-role="file" />',
      '<input type="file" accept="image/*" capture="user" hidden data-role="camera-file" />',
      '<div class="fabricvton-toast" data-role="toast" data-show="false" role="status"></div>'
    ].join("");

    document.body.appendChild(root);

    els = {
      root: root,
      title: root.querySelector('[data-role="title"]'),
      subtitle: root.querySelector('[data-role="subtitle"]'),
      back: root.querySelector('[data-action="back"]'),
      historyBtn: root.querySelector('[data-action="history"]'),
      garment: root.querySelector('[data-role="garment"]'),
      detailsPhoto: root.querySelector('[data-role="details-photo"]'),
      emailBlock: root.querySelector('[data-role="email-block"]'),
      email: root.querySelector("#fabricvton-email"),
      emailError: root.querySelector('[data-role="email-error"]'),
      preview: root.querySelector('[data-role="preview"]'),
      pairGarment: root.querySelector('[data-role="pair-garment"]'),
      pairPhoto: root.querySelector('[data-role="pair-photo"]'),
      stage: root.querySelector('[data-role="stage"]'),
      bar: root.querySelector('[data-role="bar"]'),
      pct: root.querySelector('[data-role="pct"]'),
      tip: root.querySelector('[data-role="tip"]'),
      result: root.querySelector('[data-role="result"]'),
      resultThumb: root.querySelector('[data-role="result-thumb"]'),
      resultTitle: root.querySelector('[data-role="result-title"]'),
      resultDate: root.querySelector('[data-role="result-date"]'),
      rate: root.querySelector('[data-role="rate"]'),
      historyList: root.querySelector('[data-role="history-list"]'),
      errorMsg: root.querySelector('[data-role="error-msg"]'),
      errorAction: root.querySelector('[data-role="error-action"]'),
      file: root.querySelector('[data-role="file"]'),
      cameraFile: root.querySelector('[data-role="camera-file"]'),
      toast: root.querySelector('[data-role="toast"]')
    };

    root.addEventListener("click", onPanelClick);
    els.file.addEventListener("change", function () { onFileChosen(els.file); });
    els.cameraFile.addEventListener("change", function () { onFileChosen(els.cameraFile); });
    els.email.addEventListener("keydown", function (event) {
      if (event.key === "Enter") agree();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && root.getAttribute("data-open") === "true") close();
    });

    panel = root;
  }

  function onPanelClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;
    var trigger = target.closest("[data-action]");
    if (!trigger) return;

    var action = trigger.getAttribute("data-action");
    if (action === "close") close();
    else if (action === "back") goBack();
    else if (action === "history") showHistory();
    else if (action === "pick") els.file.click();
    else if (action === "camera") els.cameraFile.click();
    else if (action === "agree") agree();
    else if (action === "decline") restart();
    else if (action === "generate") generate();
    else if (action === "add-to-cart") addToCart();
    else if (action === "share") shareLook();
    else if (action === "rate") sendRating(trigger);
    else if (action === "view-product") close();
    else if (action === "restart") restart();
    else if (action === "open-entry") openHistoryEntry(trigger.getAttribute("data-entry"));
  }

  // ── Step and header handling ─────────────────────────────

  var backTarget = null;

  function showStep(step, head) {
    var steps = panel.querySelectorAll(".fabricvton-step");
    for (var i = 0; i < steps.length; i++) {
      steps[i].setAttribute(
        "data-active",
        steps[i].getAttribute("data-step") === step ? "true" : "false"
      );
    }
    head = head || {};
    els.title.textContent = head.title || "Try It On";
    els.subtitle.textContent = head.subtitle || "See how it looks on you";
    els.back.hidden = !head.back;
    els.historyBtn.hidden = head.hideHistory === true;
    panel.querySelector(".fabricvton-body").scrollTop = 0;
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.setAttribute("data-show", "true");
    setTimeout(function () {
      els.toast.setAttribute("data-show", "false");
    }, 2200);
  }

  function showError(message) {
    stopProgress();
    els.errorMsg.textContent = message;
    els.errorAction.textContent = "Try again";
    els.errorAction.setAttribute("data-action", "restart");
    showStep("error", { title: "Try It On", subtitle: "Something needs another go" });
  }

  // ── Opening and resetting ────────────────────────────────

  function open(config) {
    if (!panel) buildPanel();
    ctx = config;
    selectedFile = null;
    photoDataUrl = "";
    lastResult = null;

    els.garment.style.backgroundImage = config.productImageUrl
      ? 'url("' + config.productImageUrl + '")'
      : "";
    els.pairGarment.style.backgroundImage = els.garment.style.backgroundImage;
    els.file.value = "";
    els.cameraFile.value = "";
    els.email.value = readStore(KEY_EMAIL);
    els.emailError.style.display = "none";

    panel.setAttribute("data-open", "true");
    showStep("intro");

    // Fire-and-forget analytics ping.
    fetch(
      config.backendUrl + "/api/tryon?event=open&shop=" + encodeURIComponent(config.shop),
      { method: "GET", keepalive: true }
    ).catch(function () {});
  }

  function close() {
    if (!panel) return;
    stopProgress();
    panel.setAttribute("data-open", "false");
  }

  function restart() {
    selectedFile = null;
    photoDataUrl = "";
    els.file.value = "";
    els.cameraFile.value = "";
    showStep("intro");
  }

  function goBack() {
    if (backTarget === "history") return showHistory();
    if (backTarget === "result" && lastResult) return showResult(lastResult, false);
    restart();
  }

  // ── Choosing a photo ─────────────────────────────────────

  function onFileChosen(input) {
    var file = input.files && input.files[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      showError("That photo is larger than 10MB. Please choose a smaller image.");
      return;
    }
    if (file.type && file.type.indexOf("image/") !== 0) {
      showError("That file isn’t an image. Please choose a JPG or PNG.");
      return;
    }

    selectedFile = file;
    var reader = new FileReader();
    reader.onerror = function () {
      showError("That photo could not be read. Please try another image.");
    };
    reader.onload = function (event) {
      photoDataUrl = event.target.result;
      els.preview.src = photoDataUrl;
      els.detailsPhoto.style.backgroundImage = 'url("' + photoDataUrl + '")';
      els.pairPhoto.style.backgroundImage = 'url("' + photoDataUrl + '")';

      // The consent card doubles as the one-time email ask, so it appears when
      // either is still outstanding.
      var needsEmail = ctx.requireEmail && !readStore(KEY_EMAIL);
      if (!hasConsent() || needsEmail) {
        els.emailBlock.style.display = needsEmail ? "block" : "none";
        showStep("details");
      } else {
        showStep("preview");
      }
    };
    reader.readAsDataURL(file);
  }

  function agree() {
    if (els.emailBlock.style.display !== "none") {
      var value = (els.email.value || "").trim();
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        els.emailError.style.display = "block";
        return;
      }
      els.emailError.style.display = "none";
      writeStore(KEY_EMAIL, value);
    }
    writeStore(KEY_CONSENT, CONSENT_VERSION);
    showStep("preview");
  }

  // ── Progress ─────────────────────────────────────────────

  var STAGES = [
    "Understanding body shape…",
    "Preparing the outfit…",
    "Generating your look…"
  ];
  var TIPS = [
    "Use a full body photo for best results",
    "Stand facing the camera, shoulders down",
    "Plain backgrounds give the cleanest result"
  ];

  function setProgress(percent, stageIndex) {
    var value = Math.max(0, Math.min(100, Math.round(percent)));
    els.bar.style.width = value + "%";
    els.pct.textContent = value + "%";
    if (typeof stageIndex === "number" && STAGES[stageIndex]) {
      els.stage.textContent = STAGES[stageIndex];
    }
  }

  /**
   * Creeps the bar forward between real events. A bar that sits still for
   * twenty seconds reads as a hung page, so it advances slowly and never
   * reaches the end until the try-on actually returns.
   */
  function startProgress() {
    stopProgress();
    var shown = 6;
    var ceiling = 30;
    setProgress(shown, 0);
    els.tip.textContent = TIPS[0];
    var tick = 0;
    progressTimer = setInterval(function () {
      tick++;
      if (shown < ceiling) shown += Math.max(0.4, (ceiling - shown) / 12);
      setProgress(shown);
      if (tick % 12 === 0) els.tip.textContent = TIPS[(tick / 12) % TIPS.length];
    }, 400);
    return {
      raise: function (newCeiling, stageIndex) {
        ceiling = newCeiling;
        if (shown < newCeiling - 20) shown = newCeiling - 20;
        setProgress(shown, stageIndex);
      }
    };
  }

  function stopProgress() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
  }

  var progress = null;

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
      return "Virtual try-on is currently disabled for this store.";
    }
    if (status === 413) {
      return serverMessage || "That photo is too large. Please choose a smaller image.";
    }
    if (status === 422 || status === 415) {
      return serverMessage || "That photo can’t be used. Please try a clear JPG or PNG.";
    }
    if (status >= 500) {
      return "Our server encountered an error. Please try again in a moment.";
    }
    return serverMessage || "The try-on could not be started.";
  }

  function generate() {
    if (!selectedFile || !photoDataUrl) return restart();
    // Belt and braces: the panel only reaches this step once consent is stored,
    // but never send a photo without it.
    if (!hasConsent()) {
      showStep("details");
      return;
    }

    showStep("loading", { hideHistory: true });
    progress = startProgress();

    compress(photoDataUrl)
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
              email: readStore(KEY_EMAIL) || "",
              consentVersion: CONSENT_VERSION,
              consentAt: new Date().toISOString()
            })
          }
        );
      })
      .then(function (res) {
        return parseJsonSafely(res).then(function (data) {
          if (!res.ok) {
            var message = messageForStatus(res.status, data.error || data.message || "");
            // The backend returns a correlation id rather than provider detail,
            // which gives the shopper something concrete to quote to support.
            if (data.requestId && res.status >= 500) {
              message += " (ref: " + data.requestId + ")";
            }
            throw new Error(message);
          }
          return data;
        });
      })
      .then(function (data) {
        if (!data.generationId) throw new Error("The try-on could not be started.");
        progress.raise(55, 1);
        poll(data.generationId, 0);
      })
      .catch(function (err) {
        showError(err.message || "Network error. Please try again.");
      });
  }

  function poll(generationId, attempt) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      showError("This is taking longer than expected. Please try again.");
      return;
    }
    if (attempt === 1) progress.raise(88, 2);

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
              throw new Error(data.error || data.message || "Could not check the try-on status.");
            }
            return data;
          });
        })
        .then(function (data) {
          if (data.status === "COMPLETED" && data.resultImageUrl) {
            stopProgress();
            setProgress(100, 2);
            var entry = {
              generationId: generationId,
              url: data.resultImageUrl,
              title: ctx.productTitle,
              image: ctx.productImageUrl,
              at: new Date().toISOString()
            };
            rememberTryOn(entry);
            showResult(entry, false);
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

  // ── Result ───────────────────────────────────────────────

  function showResult(entry, fromHistory) {
    lastResult = entry;
    backTarget = null;
    els.result.src = entry.url;
    els.resultThumb.style.backgroundImage = entry.image ? 'url("' + entry.image + '")' : "";
    els.resultTitle.textContent = entry.title || "Your try-on";
    els.resultDate.textContent = formatDate(entry.at);
    els.rate.style.display = entry.rated ? "none" : "block";
    var buttons = els.rate.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", "false");
    // The header already reads "Your Try-Ons", so the clock would be a second
    // door to the same room; the arrow goes back where the shopper came from.
    showStep("result", { title: "Your Try-Ons", subtitle: "Results", back: true, hideHistory: true });
    backTarget = fromHistory ? "history" : "intro";
  }

  function addToCart() {
    var variantId = selectedVariantId();
    if (!variantId) return cartUnavailable();

    fetch(ctx.cartAddUrl || "/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("cart rejected the item");
        return res.json();
      })
      .then(function () {
        toast("Added to your cart");
      })
      .catch(cartUnavailable);
  }

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
    toast("Use the Add to cart button on the page");
  }

  function shareLook() {
    if (!lastResult) return;
    var shareData = {
      title: lastResult.title || "My virtual try-on",
      text: "Here's how " + (lastResult.title || "this") + " looks on me.",
      url: lastResult.url
    };

    // Sharing the image itself is nicer than a link, but only some browsers
    // allow files — fall back to the link, then to the clipboard.
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(lastResult.url)
        .then(function () { toast("Link copied"); })
        .catch(function () { window.open(lastResult.url, "_blank", "noopener"); });
      return;
    }
    window.open(lastResult.url, "_blank", "noopener");
  }

  function sendRating(button) {
    if (!lastResult) return;
    var rating = button.getAttribute("data-rating");
    button.setAttribute("aria-pressed", "true");
    lastResult.rated = true;

    fetch(ctx.backendUrl + "/api/tryon/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop: ctx.shop,
        sessionId: sessionId,
        generationId: lastResult.generationId || "",
        rating: rating
      })
    }).catch(function () {});

    setTimeout(function () {
      els.rate.style.display = "none";
      toast("Thanks for the feedback");
    }, 350);
  }

  // ── History ──────────────────────────────────────────────

  function showHistory() {
    var list = readHistory();
    if (!list.length) {
      els.historyList.innerHTML =
        '<p class="fabricvton-empty">No try-ons yet. Your looks will appear here.</p>';
    } else {
      var html = "";
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        html +=
          '<button type="button" class="fabricvton-product" data-action="open-entry" data-entry="' + i + '">' +
          '<span style="background-image:url(\'' + (entry.image || entry.url) + '\')"></span>' +
          "<div><b>" + escapeHtml(entry.title || "Try-on") + "</b><em>" + formatDate(entry.at) + "</em></div>" +
          ICONS.chevron +
          "</button>";
      }
      els.historyList.innerHTML = html;
    }
    showStep("history", {
      title: "Your Try-Ons",
      subtitle: list.length === 1 ? "1 look" : list.length + " looks",
      back: true,
      hideHistory: true
    });
    backTarget = lastResult ? "result" : "intro";
  }

  function openHistoryEntry(index) {
    var list = readHistory();
    var entry = list[Number(index)];
    if (entry) showResult(entry, true);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  // ── Launch (delegated, so any number of buttons work) ────

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("[data-fabricvton-button]");
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
    loadStyles(button.getAttribute("data-css-url")).then(function () {
      open(config);
    });
  });
})();
