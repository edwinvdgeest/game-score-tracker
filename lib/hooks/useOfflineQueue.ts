"use client";

import { useEffect, useState, useCallback } from "react";

export interface OfflineQueueState {
  isOnline: boolean;
  queueLength: number;
  syncQueue: () => void;
}

export function useOfflineQueue(): OfflineQueueState {
  // Default altijd online — voorkomt false-positive bij SSR/hydration
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);

  const fetchQueueLength = useCallback(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = (e: MessageEvent<{ length: number }>) => {
      setQueueLength(e.data.length ?? 0);
    };
    navigator.serviceWorker.controller.postMessage(
      { type: "GET_QUEUE_LENGTH" },
      [channel.port2]
    );
  }, []);

  const syncQueue = useCallback(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "SYNC_QUEUE" });
  }, []);

  useEffect(() => {
    // Registreer service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }

    // Initialiseer met de werkelijke waarde na mount (browser-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Luister naar sync bevestiging van SW
    const handleMessage = (e: MessageEvent<{ type: string; count?: number }>) => {
      if (e.data?.type === "QUEUE_SYNCED") {
        setQueueLength((prev) => Math.max(0, prev - (e.data.count ?? 0)));
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    fetchQueueLength();
    const interval = setInterval(fetchQueueLength, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [fetchQueueLength, syncQueue]);

  return { isOnline, queueLength, syncQueue };
}
