"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration guard without a mounted-flag effect.
 *
 * Returns false during SSR and on the first client render, then true. Because both
 * snapshots are constant there is no setState-in-effect and no cascading render.
 */
const emptySubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

export function useIsHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getTrue, getFalse);
}

/**
 * A shared clock that ticks once a minute.
 *
 * Reading `Date.now()` during render is impure, and a render-phase setTimeout leaks a
 * timer on every render. So the current time lives in a module-level store that a single
 * interval updates; components subscribe to it. getSnapshot returns the cached value so
 * it stays stable between ticks, which useSyncExternalStore requires.
 */
let cachedNow = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const TICK_MS = 60_000;

function subscribeToMinute(onStoreChange: () => void): () => void {
  // Refresh on mount so a long-idle tab does not render a stale time for up to a minute.
  cachedNow = Date.now();
  listeners.add(onStoreChange);

  if (intervalId === null) {
    intervalId = setInterval(() => {
      cachedNow = Date.now();
      for (const listener of listeners) listener();
    }, TICK_MS);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

const getNowSnapshot = () => cachedNow;
const getServerNowSnapshot = () => 0;

/** Current epoch milliseconds, refreshed every minute. Returns 0 before hydration. */
export function useMinuteClock(): number {
  return useSyncExternalStore(
    subscribeToMinute,
    getNowSnapshot,
    getServerNowSnapshot
  );
}
