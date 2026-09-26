/*
 * Clothsy AI try-on widget for WooCommerce.
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

  if (window.__clothsyAIReady) return;
  window.__clothsyAIReady = true;

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

  var KEY_CONSENT = "clothsy_consent";
  var KEY_HISTORY = "clothsy_history";

  var panel = null;
  var els = {};
  var ctx = null; // config of the button that opened the panel
  var selectedFile = null;
  var photoDataUrl = ""; // the chosen photo, as the shopper sees it
  var lastResult = null; // { url, title, image, at, generationId }
  // The photo each try-on was made from, for the before/after slider. Held in
  // memory for this page only — never written to storage with the history,
  // which other scripts on the page can read.
  var beforeById = {};
  var sentPhoto = ""; // the compressed photo the current try-on was sent
  var progressTimer = null;
  var cameraStream = null; // live MediaStream while the camera step is open
  var session = null; // { token, apiBase, expiresAt, key }
  // The button that opened the panel, so the shopper's chosen variation can be
  // read from the form around it when adding to the cart.
  var lastButton = null;

  // ── Storage ──────────────────────────────────────────────
  // Every accessor is guarded: private mode and blocked cookies both throw, and
  // a try-on must still work when they do.

  /**
   * History is kept per tab, consent per browser.
   *
   * A history entry is a link to an image of the shopper wearing something, and
   * any other script on the merchant's page can read the same storage. Keeping
   * it in sessionStorage means it is gone when the tab closes, rather than
   * sitting on a shared computer indefinitely. Consent is a preference with
   * nothing personal in it, so it persists — that is what "we only ask once"
   * depends on.
   */
  function storageFor(key) {
    return key === KEY_HISTORY ? window.sessionStorage : window.localStorage;
  }

  function readStore(key) {
    try {
      return storageFor(key).getItem(key) || "";
    } catch (e) {
      return "";
    }
  }

  function writeStore(key, value) {
    try {
      storageFor(key).setItem(key, value);
    } catch (e) {
      /* Nothing to do: the shopper is simply asked again next time. */
    }
  }

  /** Withdrawing consent, as the consent card promises the shopper they can. */
  function forgetEverything() {
    try {
      window.sessionStorage.removeItem(KEY_HISTORY);
      window.localStorage.removeItem(KEY_CONSENT);
    } catch (e) {
      /* Blocked storage had nothing to forget in the first place. */
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
    sessionId = sessionStorage.getItem("clothsy_sid") || "";
    if (!sessionId) {
      sessionId = newSessionId();
      sessionStorage.setItem("clothsy_sid", sessionId);
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
    var button = event.target.closest && event.target.closest("[data-clothsy-ai-button]");
    if (button) loadStyles(button.getAttribute("data-css-url"));
  }

  document.addEventListener("pointerover", warmStyles, { passive: true });
  document.addEventListener("focusin", warmStyles);

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
        // Our own "not available" and "slow down" answers are final; anything
        // else (REST blocked, 401/403 from a firewall, network) gets one retry
        // via ajax.
        if (err.status === 404 || err.status === 422 || err.status === 429 || err.status === 503) throw err;
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


  // ── Icons ────────────────────────────────────────────────

  var ICONS = {
    compare:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l-6 6 6 6"/><path d="M15 6l6 6-6 6"/></svg>',
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
    root.className = "clothsy-ai-panel";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Virtual try-on");
    root.setAttribute("data-open", "false");

    root.innerHTML = [
      '<div class="clothsy-ai-head">',
      '  <button type="button" class="clothsy-ai-icon-btn" data-action="back" aria-label="Back" hidden>' + ICONS.back + "</button>",
      '  <img class="clothsy-ai-logo" data-role="logo" alt="" hidden />',
      '  <div class="clothsy-ai-head-text">',
      '    <h2 data-role="title">Try It On</h2>',
      '    <p data-role="subtitle">See how it looks on you</p>',
      "  </div>",
      '  <button type="button" class="clothsy-ai-icon-btn" data-action="history" aria-label="Your try-ons">' + ICONS.clock + "</button>",
      '  <button type="button" class="clothsy-ai-icon-btn" data-action="close" aria-label="Close try-on">' + ICONS.close + "</button>",
      "</div>",

      '<div class="clothsy-ai-body">',

      // 1. Intro
      '  <div class="clothsy-ai-step" data-step="intro">',
      '    <div class="clothsy-ai-dots"><b data-on="true">1</b><i></i><b data-role="dot2">2</b></div>',
      '    <h3 class="clothsy-ai-title">Ready to try it on?</h3>',
      '    <p class="clothsy-ai-sub">Upload your photo and see how it looks on you instantly</p>',
      '    <span class="clothsy-ai-round" data-role="garment"></span>',
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-action="pick">' + ICONS.plus + "Choose Your Photo</button>",
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-light" data-action="camera">' + ICONS.camera + "Take a photo in a mirror</button>",
      '    <p class="clothsy-ai-legal">Private &amp; secure &middot; <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Privacy</a> &middot; AI can make mistakes</p>',
      "  </div>",

      // 2. Consent, asked once
      '  <div class="clothsy-ai-step" data-step="details">',
      '    <span class="clothsy-ai-square" data-role="details-photo"></span>',
      '    <h3 class="clothsy-ai-title">Before your first try-on</h3>',
      '    <p class="clothsy-ai-sub">Here\'s what happens with your photo. We only ask once.</p>',
      '    <ul class="clothsy-ai-points">',
      "      <li>" + ICONS.sparkle + "<span>Your photo is sent to our secure AI service, only to create your try-on preview. It is never stored.</span></li>",
      "      <li>" + ICONS.chart + "<span>We keep basic usage data, like your number of try-ons, to run this service.</span></li>",
      "      <li>" + ICONS.shield + "<span>You are 18 or older, or have your guardian’s consent. Your looks stay on this device for the visit, and ‘Clear my try-ons’ removes them and withdraws consent.</span></li>",
      "    </ul>",
      '    <p class="clothsy-ai-legal" style="margin-top:0;margin-bottom:14px;">By continuing you agree to the <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Privacy notice</a></p>',
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-action="agree">Agree and continue</button>',
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-plain" data-action="decline">Not now</button>',
      "  </div>",

      // 2b. Camera
      '  <div class="clothsy-ai-step" data-step="camera">',
      '    <div class="clothsy-ai-camera">',
      '      <video data-role="video" playsinline muted autoplay></video>',
      "    </div>",
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-action="shutter">' + ICONS.camera + "Take photo</button>",
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-plain" data-action="stop-camera">Cancel</button>',
      "  </div>",

      // 3. Preview
      '  <div class="clothsy-ai-step" data-step="preview">',
      '    <div class="clothsy-ai-preview-wrap">',
      '      <img alt="The photo you chose" data-role="preview" />',
      '      <button type="button" class="clothsy-ai-chip" data-action="pick">Change Photo</button>',
      "    </div>",
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-action="generate">Try It On Now</button>',
      '    <p class="clothsy-ai-legal">By continuing you agree to the <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Privacy notice</a></p>',
      "  </div>",

      // 4. Generating
      '  <div class="clothsy-ai-step" data-step="loading">',
      '    <div class="clothsy-ai-pair">',
      '      <span data-role="pair-garment"></span>',
      "      <i>" + ICONS.sync + "</i>",
      '      <span data-role="pair-photo"></span>',
      "    </div>",
      '    <h3 class="clothsy-ai-title" data-role="stage" aria-live="polite">Understanding body shape&hellip;</h3>',
      '    <div class="clothsy-ai-bar"><b data-role="bar"></b></div>',
      '    <p class="clothsy-ai-pct" data-role="pct">6%</p>',
      '    <div class="clothsy-ai-tip"><b>TIP</b><span data-role="tip">Use a full body photo for best results</span></div>',
      "  </div>",

      // 5. Result
      '  <div class="clothsy-ai-step" data-step="result">',
      '    <div class="clothsy-ai-result">',
      '     <div class="clothsy-ai-compare" data-role="compare">',
      '      <img alt="Your virtual try-on" data-role="result" />',
      '      <img alt="" aria-hidden="true" class="clothsy-ai-before" data-role="before" />',
      '      <span class="clothsy-ai-tag clothsy-ai-tag-before" aria-hidden="true">Before</span>',
      '      <span class="clothsy-ai-tag clothsy-ai-tag-after" aria-hidden="true">After</span>',
      '      <span class="clothsy-ai-handle" data-role="handle" role="slider" tabindex="0" aria-label="Compare your photo with the try-on" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="Half and half"><i>' + ICONS.compare + "</i></span>",
      "     </div>",
      "    </div>",
      '    <button type="button" class="clothsy-ai-product" data-action="view-product">',
      '      <span data-role="result-thumb"></span>',
      "      <div><b data-role=\"result-title\"></b><em data-role=\"result-date\"></em></div>",
      "      " + ICONS.chevron,
      "    </button>",
      '    <div class="clothsy-ai-row">',
      '      <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-action="add-to-cart">' + ICONS.cart + "Add to Cart</button>",
      '      <button type="button" class="clothsy-ai-btn clothsy-ai-btn-light" data-action="share">' + ICONS.share + "Share Look</button>",
      "    </div>",
      '    <div class="clothsy-ai-rate" data-role="rate">',
      "      <p>How realistic is this AI try-on?</p>",
      "      <div>",
      '        <button type="button" data-action="rate" data-rating="up" aria-pressed="false" aria-label="Looks realistic">' + ICONS.up + "</button>",
      '        <button type="button" data-action="rate" data-rating="down" aria-pressed="false" aria-label="Doesn\'t look realistic">' + ICONS.down + "</button>",
      "      </div>",
      "    </div>",
      "  </div>",

      // 6. History
      '  <div class="clothsy-ai-step clothsy-ai-history" data-step="history">',
      '    <div data-role="history-list"></div>',
      "  </div>",

      // 7. Error
      '  <div class="clothsy-ai-step" data-step="error">',
      '    <p class="clothsy-ai-error-msg" data-role="error-msg">Something went wrong.</p>',
      '    <button type="button" class="clothsy-ai-btn clothsy-ai-btn-dark" data-role="error-action" data-action="restart">Try again</button>',
      "  </div>",

      "</div>",

      '<div class="clothsy-ai-foot"><img data-role="foot-logo" alt="" hidden />Powered by <b>Clothsy AI</b></div>',
      '<input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden data-role="file" />',
      '<input type="file" accept="image/*" capture="user" hidden data-role="camera-file" />',
      '<div class="clothsy-ai-toast" data-role="toast" data-show="false" role="status"></div>'
    ].join("");

    document.body.appendChild(root);

    els = {
      root: root,
      logo: root.querySelector('[data-role="logo"]'),
      footLogo: root.querySelector('[data-role="foot-logo"]'),
      video: root.querySelector('[data-role="video"]'),
      title: root.querySelector('[data-role="title"]'),
      subtitle: root.querySelector('[data-role="subtitle"]'),
      back: root.querySelector('[data-action="back"]'),
      historyBtn: root.querySelector('[data-action="history"]'),
      garment: root.querySelector('[data-role="garment"]'),
      detailsPhoto: root.querySelector('[data-role="details-photo"]'),
      preview: root.querySelector('[data-role="preview"]'),
      pairGarment: root.querySelector('[data-role="pair-garment"]'),
      pairPhoto: root.querySelector('[data-role="pair-photo"]'),
      stage: root.querySelector('[data-role="stage"]'),
      bar: root.querySelector('[data-role="bar"]'),
      pct: root.querySelector('[data-role="pct"]'),
      tip: root.querySelector('[data-role="tip"]'),
      result: root.querySelector('[data-role="result"]'),
      before: root.querySelector('[data-role="before"]'),
      compare: root.querySelector('[data-role="compare"]'),
      handle: root.querySelector('[data-role="handle"]'),
      resultThumb: root.querySelector('[data-role="result-thumb"]'),
      resultTitle: root.querySelector('[data-role="result-title"]'),
      resultDate: root.querySelector('[data-role="result-date"]'),
      rate: root.querySelector('[data-role="rate"]'),
      historyList: root.querySelector('[data-role="history-list"]'),
      forget: root.querySelector('[data-role="forget"]'),
      errorMsg: root.querySelector('[data-role="error-msg"]'),
      errorAction: root.querySelector('[data-role="error-action"]'),
      file: root.querySelector('[data-role="file"]'),
      cameraFile: root.querySelector('[data-role="camera-file"]'),
      toast: root.querySelector('[data-role="toast"]')
    };

    root.addEventListener("click", onPanelClick);
    bindCompare();
    els.file.addEventListener("change", function () { onFileChosen(els.file); });
    els.cameraFile.addEventListener("change", function () { onFileChosen(els.cameraFile); });
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
    else if (action === "camera") openCamera();
    else if (action === "shutter") takeShot();
    else if (action === "stop-camera") { stopCamera(); showStep("intro"); }
    else if (action === "agree") agree();
    else if (action === "decline") restart();
    else if (action === "generate") generate();
    else if (action === "add-to-cart") addToCart();
    else if (action === "share") shareLook();
    else if (action === "rate") sendRating(trigger);
    else if (action === "view-product") close();
    else if (action === "restart") restart();
    else if (action === "open-entry") openHistoryEntry(trigger.getAttribute("data-entry"));
    else if (action === "forget") {
      forgetEverything();
      lastResult = null;
      toast("Cleared from this device");
      restart();
    }
  }

  // ── Step and header handling ─────────────────────────────

  var backTarget = null;

  function showStep(step, head) {
    var steps = panel.querySelectorAll(".clothsy-ai-step");
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
    panel.querySelector(".clothsy-ai-body").scrollTop = 0;
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
    // Re-opening from a second button must not leave the first panel's camera
    // running behind a hidden step.
    stopCamera();
    ctx = config;
    selectedFile = null;
    photoDataUrl = "";
    lastResult = null;

    if (config.logoUrl) {
      els.logo.src = config.logoUrl;
      els.logo.hidden = false;
      els.footLogo.src = config.logoUrl;
      els.footLogo.hidden = false;
    }
    els.garment.style.backgroundImage = config.productImageUrl
      ? 'url("' + config.productImageUrl + '")'
      : "";
    els.pairGarment.style.backgroundImage = els.garment.style.backgroundImage;
    els.file.value = "";
    els.cameraFile.value = "";

    panel.setAttribute("data-open", "true");
    showStep("intro");

    // Fetch the token now, while the shopper reads the first step, so a
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
    if (!panel) return;
    stopProgress();
    stopCamera();
    panel.setAttribute("data-open", "false");
  }

  function restart() {
    stopCamera();
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
    if (file) acceptPhoto(file);
  }

  function acceptPhoto(file) {
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

      showStep(hasConsent() ? "preview" : "details");
    };
    reader.readAsDataURL(file);
  }

  /**
   * Opens the camera inside the panel. `capture` on a file input only reaches a
   * camera on phones — on a laptop it silently opens the file picker, which is
   * what made this button look broken — so this asks for the stream directly
   * and keeps the file input as the fallback.
   */
  function openCamera() {
    var media = navigator.mediaDevices;
    if (!media || !media.getUserMedia) return els.cameraFile.click();

    media
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false })
      .then(function (stream) {
        // The permission prompt is not modal: the shopper can close the panel
        // while it is open and only then click Allow. Without this the stream
        // would start against a hidden panel and stay live.
        if (panel.getAttribute("data-open") !== "true") {
          stream.getTracks().forEach(function (track) { track.stop(); });
          return;
        }
        cameraStream = stream;
        els.video.srcObject = stream;
        var playing = els.video.play();
        if (playing && playing.catch) playing.catch(function () {});
        showStep("camera", { title: "Take a photo", subtitle: "Stand back so we can see you", hideHistory: true });
      })
      .catch(function () {
        // Denied, or no camera on this device: the file input still works, and
        // on a phone it opens the camera app.
        els.cameraFile.click();
      });
  }

  function stopCamera() {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach(function (track) { track.stop(); });
    cameraStream = null;
    els.video.srcObject = null;
  }

  function takeShot() {
    var video = els.video;
    if (!video.videoWidth) return;

    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var g = canvas.getContext("2d");
    // A front camera shows a mirror image; save what the shopper actually saw.
    g.translate(canvas.width, 0);
    g.scale(-1, 1);
    g.drawImage(video, 0, 0);
    stopCamera();

    canvas.toBlob(function (blob) {
      if (!blob) return showError("That photo could not be taken. Please try again.");
      acceptPhoto(new File([blob], "camera.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  function agree() {
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

  function startGeneration(compressed, allowRetry) {
    return ensureToken(ctx).then(function (s) {
      return fetch(s.apiBase + "/api/woo/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Clothsy-Token": s.token },
        body: JSON.stringify({
          sessionId: sessionId,
          personImageDataUrl: compressed,
          personImageMimeType: "image/jpeg",
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
        sentPhoto = compressed;
        return startGeneration(compressed, true);
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
      ensureToken(ctx)
        .then(function (s) {
          return fetch(
            s.apiBase +
              "/api/woo/tryon?generationId=" +
              encodeURIComponent(generationId) +
              // Lets the backend rate-limit polling per shopper rather than
              // lumping every visitor on the store into one shared bucket.
              "&sessionId=" +
              encodeURIComponent(sessionId),
            { method: "GET", headers: { "X-Clothsy-Token": s.token } }
          );
        })
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
            if (sentPhoto) beforeById[generationId] = sentPhoto;
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
    // A try-on from an earlier page load has no photo to compare against; the
    // result then shows on its own, exactly as before.
    var before = entry.generationId ? beforeById[entry.generationId] : "";
    els.compare.setAttribute("data-comparing", before ? "true" : "false");
    if (before) {
      els.before.src = before;
      setCompare(50);
    } else {
      els.before.removeAttribute("src");
    }
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

  // ── Before / after ───────────────────────────────────────
  // The try-on sits underneath and the shopper's own photo on top, clipped to
  // the left of the handle. Dragging anywhere on the image moves it; the handle
  // is also a keyboard slider. touch-action: pan-y keeps vertical swipes
  // scrolling the panel on phones — only sideways drags move the split.

  function setCompare(pos) {
    pos = Math.max(0, Math.min(100, pos));
    els.compare.style.setProperty("--ca-split", pos + "%");
    els.handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    els.handle.setAttribute(
      "aria-valuetext",
      pos <= 2 ? "Showing the try-on" : pos >= 98 ? "Showing your photo" : Math.round(pos) + "% your photo"
    );
  }

  function bindCompare() {
    var dragging = false;

    function fromPointer(event) {
      var box = els.result.getBoundingClientRect();
      if (!box.width) return;
      setCompare(((event.clientX - box.left) / box.width) * 100);
    }

    els.compare.addEventListener("pointerdown", function (event) {
      if (els.compare.getAttribute("data-comparing") !== "true") return;
      dragging = true;
      if (els.compare.setPointerCapture) els.compare.setPointerCapture(event.pointerId);
      fromPointer(event);
    });
    els.compare.addEventListener("pointermove", function (event) {
      if (dragging) fromPointer(event);
    });
    function stop() { dragging = false; }
    els.compare.addEventListener("pointerup", stop);
    els.compare.addEventListener("pointercancel", stop);

    els.handle.addEventListener("keydown", function (event) {
      var now = Number(els.handle.getAttribute("aria-valuenow")) || 50;
      var step = event.shiftKey ? 25 : 5;
      var next =
        event.key === "ArrowLeft" || event.key === "ArrowDown" ? now - step :
        event.key === "ArrowRight" || event.key === "ArrowUp" ? now + step :
        event.key === "Home" ? 0 :
        event.key === "End" ? 100 : null;
      if (next === null) return;
      event.preventDefault();
      setCompare(next);
    });
  }

  function addToCart() {
    if (!ctx || !ctx.cartAddUrl || !ctx.productId) return cartUnavailable();

    var button = panel.querySelector('[data-action="add-to-cart"]');
    if (button) button.disabled = true;

    // WooCommerce's own add-to-cart endpoint, so stock checks, variations and
    // cart plugins behave exactly as they do for the theme's button.
    var form = new FormData();
    form.append("product_id", ctx.productId);
    form.append("quantity", "1");
    var variationId = lastButton ? selectedVariationId(lastButton, ctx.productId) : 0;
    if (variationId) form.append("variation_id", variationId);

    fetch(ctx.cartAddUrl, { method: "POST", credentials: "same-origin", body: form })
      .then(function (res) {
        return parseJsonSafely(res).then(function (data) {
          // Woo answers 200 with an `error` field when it refuses the item.
          if (!res.ok || (data && data.error)) throw new Error("");
          return data;
        });
      })
      .then(function () {
        if (button) button.disabled = false;
        toast("Added to your cart");
        refreshCartCount();
      })
      .catch(function (err) {
        if (button) button.disabled = false;
        if (err && err.message) return toast(err.message);
        cartUnavailable();
      });
  }

  /** Nudges the theme's mini-cart to redraw, as Woo's own button does. */
  function refreshCartCount() {
    if (window.jQuery) {
      try {
        window.jQuery(document.body).trigger("wc_fragment_refresh");
      } catch (e) {
        /* The item is in the cart either way; only the badge lags. */
      }
    }
  }

  function cartUnavailable() {
    toast("Couldn\u2019t add it here \u2014 use Add to cart on the page");
  }

  /**
   * Turns the result into a link on our own domain before sharing it.
   *
   * The image URL the panel renders is short-lived, so it is never what gets
   * pasted into a chat: the backend keeps a copy for 30 days and hands back a
   * branded page that carries the product and a way to buy it.
   */
  function shareLook() {
    if (!lastResult) return;
    var button = panel.querySelector('[data-action="share"]');

    if (lastResult.shareUrl) return handOff(lastResult.shareUrl);
    if (button) button.disabled = true;

    ensureToken(ctx)
      .then(function (s) {
        return fetch(s.apiBase + "/api/woo/tryon/share", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Clothsy-Token": s.token },
          body: JSON.stringify({
            sessionId: sessionId,
            generationId: lastResult.generationId || "",
            productTitle: lastResult.title || "",
            productUrl: ctx.productUrl || "",
            productImage: ctx.productImageUrl || ""
          })
        });
      })
      .then(function (res) {
        return parseJsonSafely(res).then(function (data) {
          if (!res.ok || !data.url) throw new Error(data.error || "");
          return data.url;
        });
      })
      .then(function (url) {
        if (button) button.disabled = false;
        lastResult.shareUrl = url;
        rememberShareUrl(lastResult.generationId, url);
        handOff(url);
      })
      .catch(function (err) {
        if (button) button.disabled = false;
        toast(err.message || "The link could not be created.");
      });
  }

  /** Native share sheet where there is one, clipboard where there isn't. */
  function handOff(url) {
    var data = {
      title: lastResult.title || "My virtual try-on",
      text: "Here's how " + (lastResult.title || "this") + " looks on me.",
      url: url
    };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(function () { toast("Link copied"); })
        .catch(function () { window.open(url, "_blank", "noopener"); });
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  /** Keeps a share link with its look, so sharing twice reuses one page. */
  function rememberShareUrl(generationId, url) {
    if (!generationId) return;
    var list = readHistory();
    for (var i = 0; i < list.length; i++) {
      if (list[i].generationId === generationId) {
        list[i].shareUrl = url;
        writeStore(KEY_HISTORY, JSON.stringify(list));
        return;
      }
    }
  }

  function sendRating(button) {
    if (!lastResult) return;
    var rating = button.getAttribute("data-rating");
    button.setAttribute("aria-pressed", "true");
    lastResult.rated = true;

    var generationId = lastResult.generationId || "";
    ensureToken(ctx)
      .then(function (s) {
        return fetch(s.apiBase + "/api/woo/tryon/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Clothsy-Token": s.token },
          body: JSON.stringify({
            sessionId: sessionId,
            generationId: generationId,
            rating: rating
          })
        });
      })
      .catch(function () {});

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
        '<p class="clothsy-ai-empty">No try-ons yet. Your looks will appear here.</p>';
    } else {
      var html = "";
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        html +=
          '<button type="button" class="clothsy-ai-product" data-action="open-entry" data-entry="' + i + '">' +
          '<span style="background-image:url(\'' + escapeHtml(safeImageUrl(entry.image) || safeImageUrl(entry.url)) + '\')"></span>' +
          "<div><b>" + escapeHtml(entry.title || "Try-on") + "</b><em>" + formatDate(entry.at) + "</em></div>" +
          ICONS.chevron +
          "</button>";
      }
      els.historyList.innerHTML = html;
      els.forget.style.display = "block";
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

  /**
   * A URL is only safe to put in markup, or hand to the browser, if it is
   * plainly an https one. History lives in storage that any other script on the
   * merchant's page can write to, so what comes back out is treated as hostile.
   */
  function safeImageUrl(value) {
    if (typeof value !== "string") return "";
    return /^https:\/\//i.test(value) || /^data:image\//i.test(value) ? value : "";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
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
      productImageUrl: button.getAttribute("data-product-image") || "",
      logoUrl: button.getAttribute("data-logo-url") || "",
      productUrl: button.getAttribute("data-product-url") || "",
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
