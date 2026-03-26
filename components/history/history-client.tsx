"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionDetail } from "@/lib/queries";
import type { Player, Game } from "@/lib/schemas";
import { formatDate } from "@/lib/utils";

interface HistoryClientProps {
  sessions: SessionDetail[];
  players: Player[];
  games: Game[];
}

export function HistoryClient({ sessions, players, games }: HistoryClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSessions, setLocalSessions] = useState(sessions);

  // Edit form state
  const [editWinnerId, setEditWinnerId] = useState("");
  const [editStarterId, setEditStarterId] = useState<string>("");
  const [editPlayedAt, setEditPlayedAt] = useState("");

  function startEdit(session: SessionDetail) {
    setEditingId(session.id);
    setEditWinnerId(session.winner_id ?? "");
    setEditStarterId(session.starter_id ?? "");
    // Convert ISO string to datetime-local format
    const dt = new Date(session.played_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditPlayedAt(local);
  }

  async function handleSave(sessionId: string) {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        winner_id: editWinnerId,
        starter_id: editStarterId || null,
        played_at: new Date(editPlayedAt).toISOString(),
      };
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      setEditingId(null);
      router.refresh();
      // Optimistic update
      const winner = players.find((p) => p.id === editWinnerId);
      if (winner) {
        setLocalSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  winner_id: editWinnerId,
                  winner,
                  starter_id: editStarterId || null,
                  played_at: new Date(editPlayedAt).toISOString(),
                }
              : s
          )
        );
      }
    } catch {
      alert("Er ging iets mis bij het opslaan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sessionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setDeletingId(null);
      setLocalSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert("Er ging iets mis bij het verwijderen.");
    } finally {
      setLoading(false);
    }
  }

  if (localSessions.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-3xl font-semibold"
        style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
      >
        Nog geen sessies gespeeld 🎲
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localSessions.map((session) => (
        <div
          key={session.id}
          className="bg-[var(--card)] rounded-2xl border overflow-hidden"
        >
          {/* Session row */}
          <div className="flex items-center gap-3 p-3">
            <span className="text-2xl">{session.game.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm truncate">{session.game.name}</div>
              <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                {formatDate(session.played_at)}
              </div>
            </div>
            <div className="flex items-center gap-1 mr-2">
              {session.winner ? (
                <>
                  <span className="text-lg">{session.winner.emoji}</span>
                  <span className="text-xs font-black">{session.winner.name}</span>
                </>
              ) : (
                <span className="text-xs font-black" style={{ color: "var(--muted-foreground)" }}>
                  🤝 Gelijkspel
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  editingId === session.id ? setEditingId(null) : startEdit(session)
                }
                className="p-1.5 rounded-xl hover:bg-[var(--muted)] text-sm cursor-pointer"
                title="Bewerken"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeletingId(session.id)}
                className="p-1.5 rounded-xl hover:bg-red-50 text-sm cursor-pointer"
                title="Verwijderen"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Edit form */}
          {editingId === session.id && (
            <div
              className="px-4 pb-4 pt-1 border-t space-y-3"
              style={{ backgroundColor: "var(--color-warm-gray)" }}
            >
              <div className="space-y-1">
                <label className="text-xs font-bold">Winnaar</label>
                <select
                  value={editWinnerId}
                  onChange={(e) => setEditWinnerId(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold bg-[var(--card)]"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">Beginner (wie begon?)</label>
                <select
                  value={editStarterId}
                  onChange={(e) => setEditStarterId(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold bg-[var(--card)]"
                >
                  <option value="">Onbekend</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">Datum & tijd</label>
                <input
                  type="datetime-local"
                  value={editPlayedAt}
                  onChange={(e) => setEditPlayedAt(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold bg-[var(--card)]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSave(session.id)}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-coral)" }}
                >
                  {loading ? "Opslaan..." : "Opslaan ✅"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)]"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deletingId === session.id && (
            <div
              className="px-4 pb-4 pt-1 border-t space-y-3"
              style={{ backgroundColor: "#fff5f5" }}
            >
              <p className="text-sm font-bold">
                Weet je zeker dat je dit potje wilt verwijderen?
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                {session.game.name} — {formatDate(session.played_at)}{session.winner ? ` — gewonnen door ${session.winner.name}` : " — Gelijkspel"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDelete(session.id)}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50 bg-red-500"
                >
                  {loading ? "Verwijderen..." : "Ja, verwijderen 🗑️"}
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)]"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
