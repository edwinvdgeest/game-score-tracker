"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Player } from "@/lib/schemas";

interface GuestWithCount {
  player: Player;
  sessionCount: number;
}

export function GuestsClient({ guests: initial }: { guests: GuestWithCount[] }) {
  const [guests, setGuests] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(player: Player) {
    if (!confirm(`Gast "${player.name}" verwijderen? Dit verwijdert ook alle scores.`)) return;
    setDeleting(player.id);
    try {
      const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setGuests((prev) => prev.filter((g) => g.player.id !== player.id));
      toast.success(`👋 ${player.name} verwijderd`);
      router.refresh();
    } catch {
      toast.error("Kon gast niet verwijderen. Probeer opnieuw.");
    } finally {
      setDeleting(null);
    }
  }

  if (guests.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">👤</div>
        <p className="font-bold text-lg" style={{ color: "var(--foreground)" }}>
          Geen gasten
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Voeg gasten toe via &quot;+ Gast&quot; in het logscherm
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guests.map(({ player, sessionCount }) => (
        <div
          key={player.id}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2"
          style={{ borderStyle: "dashed", borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <span className="text-2xl">{player.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black truncate" style={{ color: "var(--foreground)" }}>
              {player.name}
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {sessionCount === 0
                ? "Nog niet gespeeld"
                : `${sessionCount} ${sessionCount === 1 ? "potje" : "potjes"} gespeeld`}
            </p>
          </div>
          <button
            onClick={() => void handleDelete(player)}
            disabled={deleting === player.id}
            className="text-sm font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            style={{ color: "var(--muted-foreground)", backgroundColor: "var(--muted)" }}
          >
            {deleting === player.id ? "…" : "🗑️"}
          </button>
        </div>
      ))}
    </div>
  );
}
