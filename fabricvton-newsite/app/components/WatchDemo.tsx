"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Close, Play } from "./icons";

/**
 * "Watch Demo": the promo video in a branded player inside a native <dialog>.
 * Nothing downloads until the dialog opens; large screens get the 1080p file, everyone else (and anyone on
 * Data Saver) gets 720p. Both are fast-start MP4s, so playback begins while the rest streams.
 */
const SRC_720 = "/clothsy-promo-720.mp4";
const SRC_1080 = "/clothsy-promo-1080.mp4";

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const svg = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true } as const;
const Pause = () => (
  <svg {...svg} fill="currentColor">
    <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
  </svg>
);
const Sound = ({ muted }: { muted: boolean }) => (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
    {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
  </svg>
);
const Expand = () => (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export default function WatchDemo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const [src, setSrc] = useState("");
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [idle, setIdle] = useState(false);

  const poke = useCallback(() => {
    setIdle(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setIdle(true), 2600);
  }, []);

  const open = () => {
    if (!src) {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const big = window.innerWidth * (window.devicePixelRatio || 1) >= 1600;
      setSrc(big && !connection?.saveData ? SRC_1080 : SRC_720);
    }
    dialog.current?.showModal();
    poke();
  };
  const close = () => dialog.current?.close();

  // start playing as soon as the source is attached (the click that opened the dialog is the user gesture)
  useEffect(() => {
    if (src && dialog.current?.open) video.current?.play().catch(() => setPlaying(false));
  }, [src]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) v.play().catch(() => {});
    else v.pause();
    poke();
  };
  const seekTo = (t: number) => {
    const v = video.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration, t));
    poke();
  };
  const toggleMute = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    poke();
  };
  const fullscreen = () => {
    const el = frame.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) return void document.exitFullscreen();
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iPhone
  };

  const onKey = (event: React.KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === "INPUT" && event.key !== " ") return;
    const k = event.key.toLowerCase();
    if (k === " " || k === "k") {
      event.preventDefault();
      toggle();
    } else if (k === "m") toggleMute();
    else if (k === "f") fullscreen();
    else if (k === "arrowright") seekTo(time + 5);
    else if (k === "arrowleft") seekTo(time - 5);
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <>
      <button className="play-btn" type="button" onClick={open} aria-haspopup="dialog">
        <span>
          <Play />
        </span>
        Watch Demo
      </button>

      <dialog
        ref={dialog}
        className="demo-dialog"
        aria-label="Clothsy AI demo video"
        onClose={() => video.current?.pause()}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        onKeyDown={onKey}
      >
        <button className="demo-dialog-close" type="button" onClick={close} aria-label="Close video">
          <Close />
        </button>

        <div
          ref={frame}
          className={`vp${playing ? " is-playing" : ""}${idle && playing ? " is-idle" : ""}`}
          onMouseMove={poke}
          onTouchStart={poke}
        >
          {src ? (
            <video
              ref={video}
              src={src}
              poster="/clothsy-promo-poster.webp"
              playsInline
              preload="metadata"
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                setIdle(false);
              }}
              onWaiting={() => setWaiting(true)}
              onPlaying={() => setWaiting(false)}
              onCanPlay={() => setWaiting(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onProgress={(e) => {
                const b = e.currentTarget.buffered;
                if (b.length) setBuffered(b.end(b.length - 1));
              }}
              onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="vp-poster" src="/clothsy-promo-poster.webp" alt="" />
          )}

          {waiting && playing ? <span className="vp-spin" aria-hidden="true" /> : null}

          <button className="vp-big" type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} tabIndex={playing ? -1 : 0}>
            <Play />
          </button>

          <div className="vp-bar">
            <button type="button" className="vp-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause /> : <Play />}
            </button>
            <span className="vp-time">
              {fmt(time)} <i>/ {fmt(duration)}</i>
            </span>
            <div className="vp-track" style={{ "--p": `${pct}%`, "--b": `${bufPct}%` } as React.CSSProperties}>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek"
                aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
              />
            </div>
            <button type="button" className="vp-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              <Sound muted={muted} />
            </button>
            <button type="button" className="vp-btn" onClick={fullscreen} aria-label="Full screen">
              <Expand />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
