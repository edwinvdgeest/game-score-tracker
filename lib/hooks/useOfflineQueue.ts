"use client";

import { useEffect, useState, useCallback } from "react";

// Hoe vaak we de browser laten kijken of er een nieuwe sw.js op de server staat. Zonder
// dit blijft een geïnstalleerde webapp die dagen open staat op de oude service worker —
// en dus op de oude app — hangen.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registreert de service worker en zorgt dat een nieuwe versie ook echt overneemt.
 *
 * `updateViaCache: "none"` is hier het belangrijkste stukje: standaard mag de browser
 * /sw.js zelf tot 24 uur uit de HTTP-cache serveren, waardoor een gewijzigde service
 * worker pas een dag later opvalt. De Next.js PWA-gids zet daarnaast een no-store header
 * op /sw.js — die staat in next.config.ts.
 */
let registered = false;

function registerServiceWorker() {
  // De hook draait in StrictMode twee keer; zonder deze vlag zou dat een tweede
  // interval en een tweede visibilitychange-listener opleveren.
  if (registered) return;
  registered = true;

  // Was er al een controller, dan is een wisseling straks een úpdate en geen eerste
  // installatie. Alleen in dat geval willen we herladen; anders knippert elk eerste
  // bezoek meteen na het inladen.
  const hadController = navigator.serviceWorker.controller !== null;
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    // De draaiende pagina hoort nog bij de vorige build. Opnieuw laden haalt de HTML,
    // de chunks en de scores van de nieuwe deploy op.
    window.location.reload();
  });

  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then((registration) => {
      const checkForUpdate = () => registration.update().catch(() => null);

      // Terug in de app na een tijdje weg: eerste moment om een nieuwe deploy te zien.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    })
    .catch(() => null);
}

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
    if ("serviceWorker" in navigator) {
      registerServiceWorker();
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
