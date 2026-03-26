"use client";

import { useOfflineQueue } from "@/lib/hooks/useOfflineQueue";

export function OfflineBanner() {
  const { isOnline, queueLength } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-center"
      style={{
        backgroundColor: isOnline ? "var(--color-mint)" : "#f39c12",
        color: "#fff",
      }}
    >
      {isOnline ? (
        <>
          ✅ Online — {queueLength} score{queueLength !== 1 ? "s" : ""} worden gesynchroniseerd…
        </>
      ) : (
        <>
          📵 Offline{queueLength > 0 ? ` — ${queueLength} score${queueLength !== 1 ? "s" : ""} in wachtrij` : ""}
          {" "}— scores worden gesynchroniseerd zodra je weer online bent
        </>
      )}
    </div>
  );
}
