"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Cookie consent for www.fabricvton.com, shared by both root layouts.
 *
 * Google Analytics sets `_ga` cookies, so it only loads after the visitor accepts. Accept and Reject carry
 * equal weight, the choice is remembered on this device, and "Cookie settings" in the footer reopens the
 * toast (it listens for OPEN_EVENT). Rejecting after accepting disables GA and clears its cookies.
 * With no GA id configured there is nothing to consent to, so the toast never opens on its own.
 */
const KEY = "fv_cookie_consent";
const VERSION = 1;

/** Fired on window once a choice is made, so other toasts can wait their turn. */
export const CONSENT_EVENT = "fv:consent";
/** Fire on window to reopen the toast (the footer's "Cookie settings"). */
export const OPEN_EVENT = "fv:cookie-settings";

type Choice = "granted" | "denied";

/** Fallback for this visit when storage is blocked (private modes, strict settings). */
let sessionChoice: Choice | null = null;

export function readConsent(): Choice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.v === VERSION && (saved.analytics === "granted" || saved.analytics === "denied")) return saved.analytics;
  } catch {
    /* fall through */
  }
  return sessionChoice;
}

function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const name of document.cookie.split(";").map((c) => c.trim().split("=")[0])) {
    if (name !== "_ga" && name !== "_gid" && !name.startsWith("_ga_")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

const CSS = `
.fvc{position:fixed;z-index:80;left:0;right:0;bottom:0;padding:22px clamp(20px,4.4vw,64px) calc(22px + env(safe-area-inset-bottom,0px));
  background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:#18191b;
  border-top:1px solid #e7e3dc;box-shadow:0 -18px 50px -24px rgba(24,25,27,.22);font-size:14.5px;line-height:1.55;
  animation:fvc-in .55s cubic-bezier(.16,1,.3,1) both}
.fvc-inner{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:clamp(20px,4vw,56px)}
.fvc-copy{flex:1;min-width:0}
.fvc-title{margin:0 0 4px;font-size:15px;font-weight:600;letter-spacing:-.01em}
.fvc-text{margin:0;color:#55534e;max-width:62em}
.fvc-text a{color:#18191b;text-decoration:underline;text-underline-offset:2px}
.fvc-actions{display:flex;gap:10px;flex:none}
.fvc-btn{height:44px;min-width:128px;padding:0 22px;border-radius:999px;border:1.5px solid #18191b;background:#fff;color:#18191b;font:inherit;font-size:14px;font-weight:500;cursor:pointer;
  transition:background-color .25s,color .25s}
.fvc-btn:focus-visible{outline:2px solid #6738f5;outline-offset:3px}
@media (hover:hover){.fvc-btn:hover{background:#18191b;color:#fff}}
@media (max-width:767px){.fvc{padding:18px 20px calc(18px + env(safe-area-inset-bottom,0px))}.fvc-inner{flex-direction:column;align-items:stretch;gap:14px}
  .fvc-actions{display:grid;grid-template-columns:1fr 1fr}.fvc-btn{min-width:0}}
@media (max-width:768px){.fvc[data-above-nav="true"]{bottom:calc(58px + env(safe-area-inset-bottom,0px));padding-bottom:18px}}
@keyframes fvc-in{from{opacity:0;transform:translateY(100%)}}
@media (prefers-reduced-motion:reduce){.fvc{animation:none}}
`;

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export default function CookieConsent({ gaId, aboveBottomNav = false }: { gaId?: string; aboveBottomNav?: boolean }) {
  // undefined on the server and during hydration, then the saved choice (or null when there is none)
  const choice = useSyncExternalStore<Choice | null | undefined>(subscribe, readConsent, () => undefined);
  const [reopened, setReopened] = useState(false);
  const open = reopened || (choice === null && Boolean(gaId));

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  // Lets other bottom toasts step aside while this one is showing.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-consent-open", open);
  }, [open]);

  const decide = (next: Choice) => {
    sessionChoice = next;
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: next, at: new Date().toISOString() }));
    } catch {
      /* storage blocked: the choice still applies for this visit */
    }
    if (gaId) {
      const flag = `ga-disable-${gaId}`;
      const w = window as unknown as Record<string, unknown>;
      if (next === "denied") {
        w[flag] = true;
        clearAnalyticsCookies();
      } else {
        delete w[flag];
      }
    }
    setReopened(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return (
    <>
      {gaId && choice === "granted" ? <GoogleAnalytics gaId={gaId} /> : null}
      {open ? (
        <section className="fvc" role="region" aria-label="Cookie preferences" data-above-nav={aboveBottomNav}>
          <style>{CSS}</style>
          <div className="fvc-inner">
            <div className="fvc-copy">
              <p className="fvc-title">Cookies on FabricVTON</p>
              <p className="fvc-text">
                We’d like to use analytics cookies (Google Analytics) to understand how people use this site. They only
                run if you accept, and you can change your mind any time from the footer.{" "}
                <a href="/privacy">Privacy policy</a>
              </p>
            </div>
            <div className="fvc-actions">
              <button className="fvc-btn" type="button" onClick={() => decide("granted")}>
                Accept
              </button>
              <button className="fvc-btn" type="button" onClick={() => decide("denied")}>
                Reject
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Footer link that reopens the consent toast. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button className={className} type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}
