"use client";

import { useEffect, useState } from "react";
import { Download, Share2, PlusSquare, X, Sparkles, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for updates
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    toast.info("App update available! Tap to refresh.", {
                      action: {
                        label: "Update",
                        onClick: () => {
                          newWorker.postMessage({ type: "SKIP_WAITING" });
                          window.location.reload();
                        },
                      },
                    });
                  }
                });
              }
            });
          })
          .catch((err) => console.debug("[PWA] Service Worker registration:", err));
      });
    }

    // 2. Detect Standalone Display Mode
    const checkStandalone = () => {
      const isDisplayStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isDisplayStandalone);
      return isDisplayStandalone;
    };

    const standalone = checkStandalone();

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // If already installed, don't show banners
    if (standalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("clothsy_pwa_dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const shouldShow = Date.now() - dismissedTime > oneDay;

    // 4. Capture beforeinstallprompt for Android/Chrome/Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (shouldShow) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS Safari (which does not trigger beforeinstallprompt)
    if (isIosDevice && !standalone && shouldShow) {
      // Delay slightly so user gets oriented first
      const timer = setTimeout(() => setShowInstallBanner(true), 3500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    // 5. Offline / Online event handlers
    const handleOnline = () => toast.success("Back online!");
    const handleOffline = () =>
      toast.warning("You are currently offline. Cached pages remain accessible.");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowInstallBanner(false);
        toast.success("Clothsy AI installed to your home screen!");
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem("clothsy_pwa_dismissed", Date.now().toString());
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Mobile PWA Install Banner */}
      {showInstallBanner && (
        <div className="pwa-install-banner">
          <div className="pwa-install-banner-inner">
            <div className="pwa-banner-icon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192x192.png" alt="Clothsy AI" width="40" height="40" />
            </div>
            <div className="pwa-banner-text">
              <strong>Install Clothsy AI</strong>
              <span>Use as an app on your phone</span>
            </div>
            <div className="pwa-banner-actions">
              <button className="pwa-banner-install-btn" onClick={handleInstallClick}>
                <Download size={14} /> Install
              </button>
              <button
                className="pwa-banner-close-btn"
                onClick={handleDismiss}
                aria-label="Dismiss install banner"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS "Add to Home Screen" instructions modal */}
      {showIosModal && (
        <div className="pwa-ios-backdrop" onClick={() => setShowIosModal(false)}>
          <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-modal-handle" />
            <div className="pwa-ios-modal-header">
              <div className="pwa-banner-icon large">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192x192.png" alt="Clothsy AI" width="48" height="48" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Install Clothsy AI</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                  Add to your iPhone / iPad Home Screen
                </p>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="pwa-ios-steps">
              <div className="pwa-ios-step">
                <div className="pwa-ios-step-num">1</div>
                <div className="pwa-ios-step-content">
                  <p>Tap the <strong>Share</strong> button in your Safari toolbar below.</p>
                  <div className="pwa-ios-icon-badge">
                    <Share2 size={16} color="#007aff" />
                    <span>Safari Share Icon</span>
                  </div>
                </div>
              </div>

              <div className="pwa-ios-step">
                <div className="pwa-ios-step-num">2</div>
                <div className="pwa-ios-step-content">
                  <p>Scroll down the share sheet and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</p>
                  <div className="pwa-ios-icon-badge">
                    <PlusSquare size={16} color="#007aff" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="pwa-ios-step">
                <div className="pwa-ios-step-num">3</div>
                <div className="pwa-ios-step-content">
                  <p>Tap <strong>Add</strong> in the top right. You can now launch Clothsy AI full-screen as an app!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="pwa-ios-done-btn"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
