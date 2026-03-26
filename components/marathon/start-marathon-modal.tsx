"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startMarathon } from "@/lib/hooks/useMarathon";
import { Button } from "@/components/ui/button";

function todayName() {
  const now = new Date();
  const dag = now.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  return `Spellenavond ${dag}`;
}

interface Props {
  onClose: () => void;
}

export function StartMarathonModal({ onClose }: Props) {
  const [name, setName] = useState(todayName());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStart() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const marathon = await startMarathon(name.trim());
      toast.success("🏁 Marathon gestart! Veel plezier!");
      router.push(`/marathon?id=${marathon.id}`);
      onClose();
    } catch {
      toast.error("Kon de marathon niet starten. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="text-center">
          <span className="text-5xl">🏁</span>
          <h2 className="text-2xl font-black mt-2" style={{ color: "var(--foreground)" }}>
            Marathon starten
          </h2>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--muted-foreground)" }}>
            Alle potjes van vanavond worden bijgehouden
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Naam van de avond
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border-2 font-bold text-base outline-none transition-colors focus:border-[var(--color-coral)]"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            placeholder="bijv. Spellenavond vrijdag"
            maxLength={200}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl font-bold"
            onClick={onClose}
            disabled={loading}
          >
            Annuleren
          </Button>
          <Button
            className="flex-1 rounded-2xl font-black text-white"
            style={{ backgroundColor: "var(--color-coral)" }}
            onClick={() => void handleStart()}
            disabled={loading || !name.trim()}
          >
            {loading ? "Starten…" : "🏁 Start!"}
          </Button>
        </div>
      </div>
    </div>
  );
}
