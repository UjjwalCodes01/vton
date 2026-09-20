/**
 * Session memory for the interactive preview: which sample photo is active, which looks were already
 * tried, and what is in the demo cart. It lives in this browser tab only (sessionStorage) and is read
 * with useSyncExternalStore, so it is safe to render on the server and stays in step across components.
 */
import type { ShopperId } from "./tryon-data";

export type DemoSession = {
  shopper: ShopperId;
  tried: Partial<Record<ShopperId, number[]>>;
  /** "<shopper>:<lookId>" */
  cart: string[];
};

const KEY = "clothsy.preview.v1";
const DEFAULT: DemoSession = { shopper: "coats", tried: {}, cart: [] };

let cache: DemoSession | null = null;
const listeners = new Set<() => void>();

function read(): DemoSession {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<DemoSession>) } : DEFAULT;
  } catch {
    cache = DEFAULT;
  }
  return cache;
}

export const getSnapshot = (): DemoSession => read();
export const getServerSnapshot = (): DemoSession => DEFAULT;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSession(change: (s: DemoSession) => DemoSession): void {
  cache = change(read());
  try {
    sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: the in-memory copy still works for this page view */
  }
  listeners.forEach((l) => l());
}
