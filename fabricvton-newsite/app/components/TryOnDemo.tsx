"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getServerSnapshot, getSnapshot, subscribe, updateSession } from "../lib/demo-session";
import {
  SHOPPER_ORDER,
  SHOPPERS,
  garmentSrc,
  lookOf,
  lookSrc,
  personSrc,
  type ShopperId,
} from "../lib/tryon-data";
import { ArrowRight, Cart, Check, Close, Download, LinkIcon, Lock, Share, Sparkle, Swap } from "./icons";

/**
 * The hero's interactive try-on preview. One sample photo stays put for the session; the shopper picks a
 * look, the garment moves onto the photo, and the pre-rendered result is revealed. The results are
 * pre-rendered examples (there is no generation behind this), and the widget says so.
 */

type Phase = "idle" | "trying" | "result";
type Panel = "looks" | "share" | "photo";
type Layer = { key: number; id: number; quick: boolean };
type Chip = { id: number; x: number; y: number; w: number; h: number; dx: number; dy: number; scale: number };

const TRY_MS = 1500;
const TRY_MS_REDUCED = 650;
const noopSubscribe = () => () => {};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** `onStage` (optional) reports which of the three steps the shopper is on: 1 photo, 2 choosing, 3 result. */
export default function TryOnDemo({ onStage }: { onStage?: (step: number) => void }) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const canShare = useSyncExternalStore(noopSubscribe, () => typeof navigator.share === "function", () => false);

  const shopper = SHOPPERS[session.shopper];
  const tried = session.tried[shopper.id] ?? [];

  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [panel, setPanel] = useState<Panel>("looks");
  const [view, setView] = useState<"tryon" | "original">("tryon");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [chip, setChip] = useState<Chip | null>(null);
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const timers = useRef<number[]>([]);
  const counter = useRef(0);
  const cartRef = useRef<HTMLButtonElement>(null);

  const current = selected != null ? lookOf(shopper.id, selected) : null;
  const inCart = selected != null && session.cart.includes(`${shopper.id}:${selected}`);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  // Warm the cache for the current shopper's looks shortly after load, so the reveal never waits on a download.
  useEffect(() => {
    // Respect Data Saver: skip the speculative downloads.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const warm = () => {
      for (const look of SHOPPERS[shopper.id].looks) {
        const img = new window.Image();
        img.src = lookSrc(shopper.id, look.id);
      }
    };
    const handle = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(handle);
  }, [shopper.id]);

  // The chosen garment lifts off its tile and travels onto the photo (Web Animations API, transform + opacity only).
  useEffect(() => {
    const el = chipRef.current;
    if (!chip || !el) return;
    const travel = el.animate(
      [
        { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate(${chip.dx}px, ${chip.dy}px) scale(${chip.scale})`, opacity: 1, offset: 0.7 },
        { transform: `translate(${chip.dx}px, ${chip.dy}px) scale(${chip.scale * 1.05})`, opacity: 0, offset: 1 },
      ],
      { duration: 720, easing: "cubic-bezier(0.32, 0.72, 0.16, 1)", fill: "forwards" },
    );
    let live = true;
    travel.finished.then(() => live && setChip(null)).catch(() => {});
    return () => {
      live = false;
      travel.cancel();
    };
  }, [chip]);

  const resetLook = () => {
    onStage?.(1);
    clearTimers();
    setSelected(null);
    setPhase("idle");
    setPanel("looks");
    setView("original");
    setChip(null);
  };

  const launchChip = (id: number) => {
    const tile = tileRefs.current[id];
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!tile || !root || !stage) return;
    const t = tile.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const targetX = s.left + s.width * 0.5;
    const targetY = s.top + s.height * 0.46;
    setChip({
      id,
      x: t.left - r.left,
      y: t.top - r.top,
      w: t.width,
      h: t.height,
      dx: targetX - (t.left + t.width / 2),
      dy: targetY - (t.top + t.height / 2),
      scale: Math.min(2.6, (s.width * 0.34) / t.width),
    });
  };

  const tryLook = (id: number) => {
    onStage?.(3);
    clearTimers();
    const look = lookOf(shopper.id, id);
    const repeat = tried.includes(id);
    const fromResult = phase === "result" && view === "tryon";
    const reduced = prefersReducedMotion();

    setSelected(id);
    setPanel("looks");
    setView("tryon");

    const reveal = () => {
      const layer: Layer = { key: ++counter.current, id, quick: repeat };
      setLayers((prev) => (fromResult ? [...prev.slice(-1), layer] : [layer]));
      setPhase("result");
      setChip(null);
      setAnnounce(`Your try-on of ${look.name} is ready.`);
      updateSession((s) => ({
        ...s,
        tried: { ...s.tried, [shopper.id]: Array.from(new Set([...(s.tried[shopper.id] ?? []), id])) },
      }));
      timers.current.push(window.setTimeout(() => cartRef.current?.focus({ preventScroll: true }), 300));
    };

    if (repeat) {
      reveal();
      return;
    }
    setPhase("trying");
    setAnnounce(`Trying on ${look.name}.`);
    if (!reduced) launchChip(id);
    timers.current.push(window.setTimeout(reveal, reduced ? TRY_MS_REDUCED : TRY_MS));
  };

  const tryAnother = () => {
    resetLook();
    setAnnounce("Your photo is kept. Choose another look.");
    window.requestAnimationFrame(() => {
      const first = shopper.looks.find((l) => !tried.includes(l.id)) ?? shopper.looks[0];
      tileRefs.current[first.id]?.focus({ preventScroll: true });
    });
  };

  const chooseShopper = (id: ShopperId) => {
    resetLook();
    setLayers([]);
    setView("tryon");
    updateSession((s) => ({ ...s, shopper: id }));
    setAnnounce(`Using ${SHOPPERS[id].label.toLowerCase()}.`);
  };

  const addToCart = () => {
    if (selected == null || inCart) return;
    updateSession((s) => ({ ...s, cart: [...s.cart, `${shopper.id}:${selected}`] }));
    setAnnounce(`${current?.name} added to the demo cart.`);
  };

  const shareLook = async () => {
    if (!current) return;
    const url = window.location.origin;
    if (canShare) {
      try {
        await navigator.share({ title: "My Clothsy try-on", text: `${current.name}, tried on with Clothsy AI`, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timers.current.push(window.setTimeout(() => setCopied(false), 2200));
    } catch {
      /* clipboard unavailable */
    }
  };

  const toggleView = () => setView((v) => (v === "tryon" ? "original" : "tryon"));
  const showingLook = phase === "result" && view === "tryon";

  const preload = (id: number) => {
    const img = new window.Image();
    img.src = lookSrc(shopper.id, id);
  };

  return (
    <div className="tv" ref={rootRef} data-phase={phase} id="demo" tabIndex={-1}>
      <div className="tv-head">
        <span className="tv-head-title">
          <Sparkle /> Virtual try-on
        </span>
        <span className="tv-head-meta">
          <span className="preview-tag">Interactive preview</span>
          {session.cart.length > 0 ? (
            <span className="tv-cart" aria-label={`${session.cart.length} in demo cart`}>
              <Cart /> {session.cart.length}
            </span>
          ) : null}
        </span>
      </div>

      <div className="tv-body">
        {/* ---------------- the photo ---------------- */}
        <div className="tv-stage-wrap">
          <div
            className="tv-stage"
            ref={stageRef}
            data-view={showingLook ? "look" : "original"}
            onClick={(event) => {
              if (phase !== "result") return;
              if ((event.target as HTMLElement).closest("button")) return;
              if (window.matchMedia("(hover: none)").matches) toggleView();
            }}
          >
            <Image
              className="tv-base"
              src={personSrc(shopper.id)}
              alt={shopper.alt}
              width={shopper.width}
              height={shopper.height}
              style={{ objectPosition: shopper.focus }}
              sizes="(max-width: 900px) 92vw, 420px"
              priority
              unoptimized
            />

            <div className="tv-looks" aria-hidden={!showingLook}>
              {layers.map((layer, i) => {
                const top = i === layers.length - 1;
                return (
                  <Image
                    key={layer.key}
                    className={`tv-look ${top ? "is-top" : "is-under"}${layer.quick ? " is-quick" : ""}`}
                    src={lookSrc(shopper.id, layer.id)}
                    alt={`${lookOf(shopper.id, layer.id).name} on the shopper (pre-rendered sample)`}
                    width={shopper.width}
                    height={shopper.height}
                    style={{ objectPosition: shopper.focus, "--ox": "50%", "--oy": "42%" } as CSSProperties}
                    sizes="(max-width: 900px) 92vw, 420px"
                    unoptimized
                    onAnimationEnd={top ? () => setLayers((ls) => (ls.length > 1 ? ls.slice(-1) : ls)) : undefined}
                  />
                );
              })}
            </div>

            <span className="tv-label" key={showingLook ? "look" : "original"}>
              {showingLook ? "Try-on" : "Your photo"}
            </span>

            {phase === "trying" && current ? (
              <div className="tv-veil" role="status">
                <span className="tv-veil-thumb">
                  <Image
                    src={garmentSrc(shopper.id, current.id)}
                    alt=""
                    width={240}
                    height={320}
                    unoptimized
                    style={{ objectPosition: current.tile.position, transform: `scale(${current.tile.zoom})`, transformOrigin: current.tile.position }}
                  />
                </span>
                <span className="tv-veil-copy">
                  <small>Trying on</small>
                  <b>{current.name}</b>
                  <span className="tv-veil-line" aria-hidden="true" />
                  <em>Creating your look…</em>
                </span>
              </div>
            ) : null}

            {phase === "result" ? (
              <div className="tv-compare" role="group" aria-label="Compare your photo and the try-on">
                <button type="button" aria-pressed={view === "original"} onClick={() => setView("original")}>
                  Original
                </button>
                <button type="button" aria-pressed={view === "tryon"} onClick={() => setView("tryon")}>
                  Try-on
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* ---------------- the panel ---------------- */}
        <div className="tv-panel" aria-busy={phase === "trying"}>
          {panel === "share" && current ? (
            <div className="tv-sheet" key="share">
              <div className="tv-sheet-head">
                <b>Share your look</b>
                <button type="button" className="tv-x" aria-label="Close share" onClick={() => setPanel("looks")}>
                  <Close />
                </button>
              </div>
              <div className="tv-share-card">
                <span className="tv-share-thumb">
                  <Image src={lookSrc(shopper.id, current.id)} alt="" width={shopper.width} height={shopper.height} unoptimized style={{ objectPosition: shopper.focus }} />
                </span>
                <span>
                  <b>{current.name}</b>
                  <small>Tried on with Clothsy AI</small>
                </span>
              </div>
              <div className="tv-share-actions">
                <button type="button" className="tv-btn tv-btn-ghost" onClick={shareLook}>
                  {canShare ? <Share /> : <LinkIcon />} {canShare ? "Share" : copied ? "Link copied" : "Copy link"}
                </button>
                <a className="tv-btn tv-btn-ghost" href={lookSrc(shopper.id, current.id)} download={`clothsy-${slug(current.name)}.webp`}>
                  <Download /> Save image
                </a>
              </div>
              <button type="button" className="tv-btn tv-btn-dark" onClick={() => setPanel("looks")}>
                Done
              </button>
            </div>
          ) : panel === "photo" ? (
            <div className="tv-sheet" key="photo">
              <div className="tv-sheet-head">
                <b>Choose a photo</b>
                <button type="button" className="tv-x" aria-label="Close" onClick={() => setPanel("looks")}>
                  <Close />
                </button>
              </div>
              <div className="tv-photos" role="group" aria-label="Sample photos">
                {SHOPPER_ORDER.map((id) => (
                  <button key={id} type="button" className="tv-photo" aria-pressed={session.shopper === id} onClick={() => chooseShopper(id)}>
                    <Image src={personSrc(id)} alt="" width={880} height={1200} unoptimized style={{ objectPosition: SHOPPERS[id].focus }} />
                    <span>{SHOPPERS[id].label}</span>
                  </button>
                ))}
              </div>
              <p className="tv-note">
                <Lock /> In a store, this is where a shopper adds their own photo. Nothing is sent until they give consent.
              </p>
            </div>
          ) : phase === "result" && current ? (
            <div className="tv-result" key="result">
              <p className="tv-eyebrow">Your try-on</p>
              <h3 className="tv-name">{current.name}</h3>
              <p className="tv-sub">AI try-on · sample</p>

              <button type="button" className="tv-btn tv-btn-primary tv-cta" ref={cartRef} onClick={addToCart} aria-disabled={inCart}>
                {inCart ? <Check /> : <Cart />} {inCart ? "Added to cart" : "Add to cart"}
              </button>
              <div className="tv-row">
                <button type="button" className="tv-btn tv-btn-ghost" onClick={() => setPanel("share")}>
                  <Share /> Share look
                </button>
                <button type="button" className="tv-btn tv-btn-ghost" onClick={() => setPanel("photo")}>
                  <Swap /> Change photo
                </button>
              </div>
              <button type="button" className="tv-link" onClick={tryAnother}>
                Try another item <ArrowRight />
              </button>

              {tried.length > 1 ? (
                <div className="tv-session">
                  <p>Tried this session</p>
                  <div>
                    {tried.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="tv-mini"
                        aria-pressed={id === selected}
                        aria-label={`View ${lookOf(shopper.id, id).name}`}
                        onClick={() => tryLook(id)}
                      >
                        <Image src={lookSrc(shopper.id, id)} alt="" width={shopper.width} height={shopper.height} unoptimized style={{ objectPosition: shopper.focus }} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="tv-choose" key="choose">
              <p className="tv-eyebrow">Choose a look</p>
              <p className="tv-sub">Your photo stays put. Try as many as you like.</p>

              <div className="tv-tiles" role="group" aria-label="Looks">
                {shopper.looks.map((look) => {
                  const done = tried.includes(look.id);
                  return (
                    <button
                      key={look.id}
                      type="button"
                      className="tv-tile"
                      ref={(el) => {
                        tileRefs.current[look.id] = el;
                      }}
                      aria-pressed={selected === look.id}
                      aria-label={`${look.name}${done ? ", already tried" : ""}`}
                      disabled={phase === "trying"}
                      onClick={() => {
                        setSelected(look.id);
                        onStage?.(2);
                      }}
                      onPointerEnter={() => preload(look.id)}
                      onFocus={() => preload(look.id)}
                    >
                      <span className="tv-tile-img">
                        <Image
                          src={garmentSrc(shopper.id, look.id)}
                          alt=""
                          width={240}
                          height={320}
                          unoptimized
                          style={{ objectPosition: look.tile.position, transform: `scale(${look.tile.zoom})`, transformOrigin: look.tile.position }}
                        />
                      </span>
                      {done ? (
                        <span className="tv-tile-done" aria-hidden="true">
                          <Check />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="tv-pick">
                <small>{current ? "Selected" : "Nothing selected"}</small>
                <b>{current ? current.name : "Tap a piece to choose it"}</b>
              </div>

              <button
                type="button"
                className="tv-btn tv-btn-primary tv-cta"
                disabled={selected == null || phase === "trying"}
                onClick={() => selected != null && tryLook(selected)}
              >
                Try this look <ArrowRight />
              </button>
              <button type="button" className="tv-link tv-link-quiet" onClick={() => setPanel("photo")} disabled={phase === "trying"}>
                Use a different photo
              </button>
            </div>
          )}
        </div>

        {chip ? (
          <div
            className="tv-chip"
            ref={chipRef}
            aria-hidden="true"
            style={{ left: chip.x, top: chip.y, width: chip.w, height: chip.h }}
          >
            <Image
              src={garmentSrc(shopper.id, chip.id)}
              alt=""
              width={240}
              height={320}
              unoptimized
              style={{
                objectPosition: lookOf(shopper.id, chip.id).tile.position,
                transform: `scale(${lookOf(shopper.id, chip.id).tile.zoom})`,
                transformOrigin: lookOf(shopper.id, chip.id).tile.position,
              }}
            />
          </div>
        ) : null}
      </div>

      <p className="tv-foot">
        Sample photo and pre-rendered looks, so you can see the flow. In a store, Clothsy creates the look from the
        shopper&apos;s own photo.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
