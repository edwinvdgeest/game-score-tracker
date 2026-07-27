"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import type { Player } from "@/lib/schemas";
import { jsonFetcher } from "@/lib/hooks/fetcher";

const PLAYERS_KEY = "/api/players?include_inactive=1";

const PLAYER_EMOJIS = [
  "🎯", "🌟", "🦋", "🎲", "🚀", "🐙", "🦊", "🐝", "🍀", "⚡",
  "🎭", "🎪", "🌈", "🎨", "🎸", "🌺",
];

/** Ververst zowel de beheerlijst als de spelerslijst die de rest van de app gebruikt. */
async function refreshPlayers() {
  await Promise.all([mutate(PLAYERS_KEY), mutate("/api/players")]);
}

export function PlayersClient() {
  const { data: players, isLoading } = useSWR<Player[]>(PLAYERS_KEY, jsonFetcher);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState(PLAYER_EMOJIS[0] ?? "🎲");

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          emoji: newEmoji,
          // Een nieuwe vaste speler doet standaard mee — dat is waarom je hem toevoegt.
          include_by_default: true,
        }),
      });
      if (!res.ok) throw new Error("Toevoegen mislukt");
      await refreshPlayers();
      setNewName("");
      toast.success(`${newEmoji} ${name} toegevoegd`);
    } catch {
      toast.error("Kon speler niet toevoegen.");
    } finally {
      setAdding(false);
    }
  }

  async function patchPlayer(player: Player, body: Record<string, unknown>) {
    setBusyId(player.id);
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      await refreshPlayers();
    } catch {
      toast.error("Kon de wijziging niet opslaan.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(player: Player) {
    setBusyId(player.id);
    try {
      const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      await refreshPlayers();
      toast.success(`${player.emoji} ${player.name} verwijderd`);
    } catch {
      toast.error("Kon speler niet verwijderen.");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-3xl">👥</div>;
  }

  const all = players ?? [];
  const regular = all.filter((p) => !p.is_guest && p.is_active);
  const guests = all.filter((p) => p.is_guest && p.is_active);
  const inactive = all.filter((p) => !p.is_active);

  return (
    <div className="space-y-6">
      {/* Nieuwe vaste speler */}
      <section
        className="rounded-3xl border p-4 space-y-3"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2 className="font-extrabold text-base">➕ Vaste speler toevoegen</h2>
        <div className="flex gap-2">
          <select
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className="rounded-xl border px-2 py-2 text-xl"
            style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
            aria-label="Emoji"
          >
            {PLAYER_EMOJIS.map((emoji) => (
              <option key={emoji} value={emoji}>
                {emoji}
              </option>
            ))}
          </select>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam"
            maxLength={50}
            className="flex-1 rounded-xl border px-3 py-2 text-base font-semibold"
            style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={adding || newName.trim() === ""}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            {adding ? "…" : "Toevoegen"}
          </button>
        </div>
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Gastspelers voeg je toe tijdens het loggen van een potje.
        </p>
      </section>

      {regular.length > 0 && (
        <PlayerSection title="Vaste spelers">
          {regular.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              busy={busyId === player.id}
              onPatch={patchPlayer}
              onDelete={handleDelete}
            />
          ))}
        </PlayerSection>
      )}

      {guests.length > 0 && (
        <PlayerSection title="🎭 Gasten">
          {guests.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              busy={busyId === player.id}
              onPatch={patchPlayer}
              onDelete={handleDelete}
            />
          ))}
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Gasten hebben hun eigen blok op het scorebord en tellen niet mee in het
            hoofd-leaderboard.
          </p>
        </PlayerSection>
      )}

      {inactive.length > 0 && (
        <PlayerSection title="Gedeactiveerd">
          <ul className="space-y-2 opacity-60">
            {inactive.map((player) => (
              <li
                key={player.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-2xl">{player.emoji}</span>
                <span className="font-bold flex-1">{player.name}</span>
                <button
                  onClick={() => void patchPlayer(player, { is_active: true })}
                  disabled={busyId === player.id}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border-2 cursor-pointer disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  Weer activeren
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Deze spelers hebben meegespeeld en blijven bewaard in de historie.
          </p>
        </PlayerSection>
      )}
    </div>
  );
}

function PlayerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function PlayerRow({
  player,
  busy,
  onPatch,
  onDelete,
}: {
  player: Player;
  busy: boolean;
  onPatch: (p: Player, body: Record<string, unknown>) => Promise<void>;
  onDelete: (p: Player) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(player.name);
  const [emoji, setEmoji] = useState(player.emoji);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onPatch(player, { name: trimmed, emoji });
    setEditing(false);
  }

  if (confirm) {
    return (
      <li
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
        style={{
          borderColor: "var(--color-coral)",
          backgroundColor: "color-mix(in srgb, var(--color-coral) 5%, var(--card))",
        }}
      >
        <span className="text-2xl">{player.emoji}</span>
        <span className="font-bold flex-1 text-sm">
          {player.name} verwijderen? Als er potjes van zijn, wordt hij alleen
          gedeactiveerd.
        </span>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 rounded-xl border-2 font-bold text-xs cursor-pointer"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Nee
        </button>
        <button
          onClick={() => void onDelete(player)}
          disabled={busy}
          className="px-3 py-1.5 rounded-xl font-bold text-xs text-white cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {busy ? "…" : "Ja, weg"}
        </button>
      </li>
    );
  }

  if (editing) {
    return (
      <li
        className="flex items-center gap-2 px-4 py-3 rounded-2xl border"
        style={{ backgroundColor: "var(--card)" }}
      >
        <select
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="rounded-xl border px-2 py-2 text-xl"
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          aria-label="Emoji"
        >
          {[emoji, ...PLAYER_EMOJIS.filter((e) => e !== emoji)].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="flex-1 min-w-0 rounded-xl border px-3 py-2 text-base font-semibold"
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
        />
        <button
          onClick={() => void save()}
          disabled={busy || name.trim() === ""}
          className="px-3 py-2 rounded-xl font-bold text-xs text-white cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {busy ? "…" : "✅"}
        </button>
        <button
          onClick={() => {
            setName(player.name);
            setEmoji(player.emoji);
            setEditing(false);
          }}
          className="px-3 py-2 rounded-xl border font-bold text-xs cursor-pointer"
        >
          ✕
        </button>
      </li>
    );
  }

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{ backgroundColor: "var(--card)" }}
    >
      <span className="text-2xl">{player.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{player.name}</div>
        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer mt-0.5">
          <input
            type="checkbox"
            checked={player.include_by_default}
            disabled={busy}
            onChange={(e) =>
              void onPatch(player, { include_by_default: e.target.checked })
            }
            className="w-4 h-4 cursor-pointer"
          />
          <span style={{ color: "var(--muted-foreground)" }}>
            Doet standaard mee
          </span>
        </label>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-xl hover:bg-[var(--muted)] text-sm cursor-pointer"
        title="Naam en emoji wijzigen"
      >
        ✏️
      </button>
      <button
        onClick={() => void onPatch(player, { is_active: false })}
        disabled={busy}
        className="text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer disabled:opacity-50"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        title="Verbergen zonder de historie te raken"
      >
        Deactiveer
      </button>
      <button
        onClick={() => setConfirm(true)}
        className="p-1.5 rounded-xl hover:bg-red-50 text-sm cursor-pointer"
        title="Verwijderen"
      >
        🗑️
      </button>
    </li>
  );
}
