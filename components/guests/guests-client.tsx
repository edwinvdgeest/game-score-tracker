"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import type { Player } from "@/lib/schemas";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ophalen mislukt");
  return res.json() as Promise<Player[]>;
}

export function GuestsClient() {
  const { data: guests, isLoading } = useSWR<Player[]>("/api/guests", fetcher);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(player: Player) {
    setDeleting(player.id);
    try {
      const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      await mutate("/api/guests");
      toast.success(`${player.emoji} ${player.name} verwijderd`);
    } catch {
      toast.error("Kon gastspeler niet verwijderen.");
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-3xl">
        🎭
      </div>
    );
  }

  const active = (guests ?? []).filter((g) => g.is_active);
  const inactive = (guests ?? []).filter((g) => !g.is_active);

  return (
    <div className="space-y-6">
      {active.length === 0 && inactive.length === 0 && (
        <div
          className="text-center py-12 rounded-3xl border-2 border-dashed"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-5xl mb-3">🎭</div>
          <p className="font-bold text-base" style={{ color: "var(--muted-foreground)" }}>
            Nog geen gastspelers
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Voeg een gast toe via de Loggen-pagina
          </p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Actieve gasten
          </h2>
          <ul className="space-y-2">
            {active.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                deleting={deleting === guest.id}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </section>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Eerder gespeeld (gedeactiveerd)
          </h2>
          <ul className="space-y-2 opacity-60">
            {inactive.map((guest) => (
              <li
                key={guest.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-2xl">{guest.emoji}</span>
                <span className="font-bold flex-1">{guest.name}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                >
                  inactief
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Deze gasten hebben meegespeeld en zijn bewaard in de historie.
          </p>
        </section>
      )}
    </div>
  );
}

function GuestRow({
  guest,
  deleting,
  onDelete,
}: {
  guest: Player;
  deleting: boolean;
  onDelete: (p: Player) => void;
}) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <li
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
        style={{ borderColor: "var(--color-coral)", backgroundColor: "color-mix(in srgb, var(--color-coral) 5%, var(--card))" }}
      >
        <span className="text-2xl">{guest.emoji}</span>
        <span className="font-bold flex-1 text-sm" style={{ color: "var(--foreground)" }}>
          {guest.name} verwijderen?
        </span>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 rounded-xl border-2 font-bold text-xs"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Nee
        </button>
        <button
          onClick={() => onDelete(guest)}
          disabled={deleting}
          className="px-3 py-1.5 rounded-xl font-bold text-xs text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {deleting ? "…" : "Ja, weg"}
        </button>
      </li>
    );
  }

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-2xl">{guest.emoji}</span>
      <span className="font-bold flex-1">{guest.name}</span>
      <button
        onClick={() => setConfirm(true)}
        className="text-sm font-bold px-3 py-1.5 rounded-xl border-2 transition-colors hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        Verwijder
      </button>
    </li>
  );
}
