"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import type { SessionDetail } from "@/lib/queries";
import type { Player } from "@/lib/schemas";
import { computeWinner, parseScoreEntries } from "@/lib/stats";
import { formatDate } from "@/lib/utils";

interface HistoryClientProps {
  sessions: SessionDetail[];
  players: Player[];
}

export function HistoryClient({ sessions, players }: HistoryClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSessions, setLocalSessions] = useState(sessions);

  // Edit form state
  const [editWinnerId, setEditWinnerId] = useState("");
  const [editStarterId, setEditStarterId] = useState<string>("");
  const [editPlayedAt, setEditPlayedAt] = useState("");
  /** Deelnemers van de sessie die bewerkt wordt, met hun score als tekst. */
  const [editParticipants, setEditParticipants] = useState<Player[]>([]);
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [editNote, setEditNote] = useState("");

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

    setEditNote(session.notes ?? "");

    const participants = session.scores.map((entry) => entry.player);
    setEditParticipants(participants);
    setEditScores(
      Object.fromEntries(
        session.scores.map((entry) => [
          entry.player.id,
          entry.score === null ? "" : String(entry.score),
        ])
      )
    );
  }

  /**
   * Zijn er scores ingevuld? Zo ja, dan bepalen die de winnaar en is de select
   * overbodig. Historische sessies zonder scores houden de handmatige keuze.
   */
  const hasAnyScore = editParticipants.some(
    (p) => (editScores[p.id] ?? "").trim() !== ""
  );

  const derivedWinnerId = (() => {
    const session = localSessions.find((s) => s.id === editingId);
    if (!session || !hasAnyScore) return null;
    return computeWinner(
      parseScoreEntries(
        editParticipants.map((p) => p.id),
        editScores
      ),
      session.game.lowest_score_wins ?? false
    );
  })();

  /** De winnaar die opgeslagen wordt: afgeleid uit scores, of handmatig gekozen. */
  const effectiveWinnerId = hasAnyScore ? derivedWinnerId : editWinnerId || null;

  async function handleSave(sessionId: string) {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        winner_id: effectiveWinnerId,
        starter_id: editStarterId || null,
        played_at: new Date(editPlayedAt).toISOString(),
        notes: editNote.trim() || null,
      };
      // Scores meesturen vervangt de deelnemersset, dus alleen doen als we die set
      // kennen — en dan altijd volledig, inclusief de lege scores.
      if (editParticipants.length > 0) {
        body.scores = parseScoreEntries(
          editParticipants.map((p) => p.id),
          editScores
        );
      }

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");

      setEditingId(null);
      router.refresh();
      // Het scorebord verandert mee zodra een score of winnaar verandert.
      void mutate((key) => typeof key === "string" && key.startsWith("/api/stats"));
      void mutate("/api/sessions");

      // Optimistische update — ook bij gelijkspel, waar de winnaar null is.
      const winner = players.find((p) => p.id === effectiveWinnerId) ?? null;
      const parsed = parseScoreEntries(
        editParticipants.map((p) => p.id),
        editScores
      );
      setLocalSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                winner_id: effectiveWinnerId,
                winner,
                starter_id: editStarterId || null,
                played_at: new Date(editPlayedAt).toISOString(),
                notes: editNote.trim() || null,
                scores:
                  editParticipants.length > 0
                    ? editParticipants.map((p) => ({
                        player: p,
                        score:
                          parsed.find((e) => e.player_id === p.id)?.score ?? null,
                      }))
                    : s.scores,
              }
            : s
        )
      );
      toast.success("Potje bijgewerkt ✅");
    } catch {
      toast.error("Er ging iets mis bij het opslaan.");
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
      void mutate((key) => typeof key === "string" && key.startsWith("/api/stats"));
      void mutate("/api/sessions");
      toast.success("Potje verwijderd 🗑️");
    } catch {
      toast.error("Er ging iets mis bij het verwijderen.");
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
      {/* Tabelkop — alleen zichtbaar op tablet */}
      <div
        className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)", backgroundColor: "var(--color-warm-gray)" }}
      >
        <span>Spel</span>
        <span>Winnaar</span>
        <span>Datum</span>
        <span>Acties</span>
      </div>

      {localSessions.map((session) => (
        <div
          key={session.id}
          className="bg-[var(--card)] rounded-2xl border overflow-hidden"
        >
          {/* Session row */}
          <div className="flex items-center gap-3 p-3 md:grid md:grid-cols-[2fr_1fr_1fr_auto] md:gap-4 md:px-4 md:py-3">
            {/* Spel */}
            <div className="flex items-center gap-3 min-w-0 md:col-span-1">
              <span className="text-2xl flex-shrink-0">{session.game.emoji}</span>
              <div className="min-w-0">
                <div className="font-extrabold text-sm truncate">{session.game.name}</div>
                <div className="text-xs font-semibold md:hidden" style={{ color: "var(--muted-foreground)" }}>
                  {formatDate(session.played_at)}
                </div>
              </div>
            </div>
            {/* Winnaar */}
            <div className="flex items-center gap-1 mr-2 md:mr-0">
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
            {/* Datum — alleen tablet */}
            <div className="hidden md:block text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {formatDate(session.played_at)}
            </div>
            {/* Acties */}
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

          {/* Scores — samenvatting onder de rij */}
          {session.scores.some((entry) => entry.score !== null) && (
            <div
              className="px-3 pb-3 md:px-4 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              {session.scores.map((entry) => (
                <span key={entry.player.id}>
                  {entry.player.emoji} {entry.score ?? "—"}
                </span>
              ))}
            </div>
          )}

          {/* Notitie */}
          {session.notes && (
            <div
              className="px-3 pb-3 md:px-4 text-xs font-semibold italic"
              style={{ color: "var(--muted-foreground)" }}
            >
              📝 {session.notes}
            </div>
          )}

          {/* Edit form */}
          {editingId === session.id && (
            <div
              className="px-4 pb-4 pt-1 border-t space-y-3"
              style={{ backgroundColor: "var(--color-warm-gray)" }}
            >
              {/* Scores per deelnemer */}
              {editParticipants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold">
                    Scores{" "}
                    {session.game.lowest_score_wins && (
                      <span className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                        (laagste wint)
                      </span>
                    )}
                  </label>
                  {editParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-lg w-6 text-center">{p.emoji}</span>
                      <span className="text-sm font-bold flex-1 truncate">{p.name}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editScores[p.id] ?? ""}
                        onChange={(e) =>
                          setEditScores((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="—"
                        className="w-24 rounded-xl border px-3 py-2 text-base font-bold text-right"
                        style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold">Winnaar</label>
                {hasAnyScore ? (
                  <div
                    className="rounded-xl border px-3 py-2 text-sm font-bold"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    {derivedWinnerId ? (
                      <>
                        🏆{" "}
                        {editParticipants.find((p) => p.id === derivedWinnerId)?.name ??
                          "Onbekend"}{" "}
                        wint
                      </>
                    ) : (
                      <>🤝 Gelijkspel</>
                    )}
                    <div
                      className="text-xs font-semibold mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Volgt automatisch uit de scores
                    </div>
                  </div>
                ) : (
                  <select
                    value={editWinnerId}
                    onChange={(e) => setEditWinnerId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                    style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                  >
                    <option value="">🤝 Gelijkspel</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">Beginner (wie begon?)</label>
                <select
                  value={editStarterId}
                  onChange={(e) => setEditStarterId(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
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
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">📝 Notitie</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Bijzonderheden van dit potje…"
                  className="w-full rounded-xl border px-3 py-2 text-base font-semibold resize-y"
                  style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
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
