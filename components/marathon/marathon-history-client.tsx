"use client";

import { useState } from "react";
import Link from "next/link";
import { useMarathonDetail } from "@/lib/hooks/useMarathon";
import { useMarathonHistory } from "@/lib/hooks/useMarathon";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { MarathonSummary } from "@/lib/queries";

function MarathonCard({ summary, onSelect }: { summary: MarathonSummary; onSelect: () => void }) {
  const { marathon, sessionCount, winner, gamesPlayed } = summary;
  const date = format(new Date(marathon.started_at), "EEEE d MMMM yyyy", { locale: nl });

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-3xl p-4 space-y-2 border-2 transition-colors hover:border-[var(--color-coral)]"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-black text-base" style={{ color: "var(--foreground)" }}>
            {marathon.is_active ? "🏁 " : ""}{marathon.name ?? "Spellenavond"}
          </p>
          <p className="text-xs font-semibold capitalize" style={{ color: "var(--muted-foreground)" }}>
            {date}
          </p>
        </div>
        {winner && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-black"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-warm-yellow) 20%, var(--card))", color: "var(--foreground)" }}
          >
            🥇 {winner.emoji} {winner.name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
        <span>🎮 {sessionCount} potjes</span>
        {gamesPlayed.length > 0 && (
          <span className="truncate">{gamesPlayed.slice(0, 3).join(", ")}{gamesPlayed.length > 3 ? "…" : ""}</span>
        )}
      </div>
    </button>
  );
}

function MarathonDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const { detail, isLoading } = useMarathonDetail(id);

  if (isLoading || !detail) {
    return <div className="py-8 text-center text-2xl">⏳</div>;
  }

  const { marathon, sessions, players, winCounts, mostPlayedGame, longestStreak } = detail;
  const ranked = [...players].sort((a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="font-bold text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Terug
        </button>
      </div>

      <h2 className="text-xl font-black" style={{ color: "var(--foreground)" }}>
        {marathon.name ?? "Spellenavond"}
      </h2>

      {/* Eindstand */}
      <div className="space-y-2">
        {ranked.map((player, i) => {
          const wins = winCounts[player.id] ?? 0;
          return (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "var(--card)", border: "2px solid var(--border)" }}
            >
              <span className="text-2xl">{["🥇", "🥈", "🥉"][i] ?? "🎮"}</span>
              <span className="text-2xl">{player.emoji}</span>
              <span className="flex-1 font-black" style={{ color: "var(--foreground)" }}>{player.name}</span>
              <span className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{wins} wins</span>
            </div>
          );
        })}
      </div>

      {/* Fun stats */}
      <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: "var(--card)" }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Stats</p>
        <div className="space-y-1.5 text-sm font-bold">
          <div className="flex justify-between">
            <span style={{ color: "var(--muted-foreground)" }}>Totaal potjes</span>
            <span style={{ color: "var(--foreground)" }}>{sessions.length}</span>
          </div>
          {mostPlayedGame && (
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Meest gespeeld</span>
              <span style={{ color: "var(--foreground)" }}>{mostPlayedGame.emoji} {mostPlayedGame.name} ({mostPlayedGame.count}×)</span>
            </div>
          )}
          {longestStreak && longestStreak.streak >= 2 && (
            <div className="flex justify-between">
              <span style={{ color: "var(--muted-foreground)" }}>Langste streak</span>
              <span style={{ color: "var(--foreground)" }}>{longestStreak.player.emoji} {longestStreak.player.name} ({longestStreak.streak}×)</span>
            </div>
          )}
        </div>
      </div>

      {/* Alle rondes */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Alle potjes</p>
        {sessions.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ backgroundColor: "var(--card)" }}
          >
            <span className="text-xs w-4 text-right font-bold" style={{ color: "var(--muted-foreground)" }}>{i + 1}</span>
            <span>{s.game?.emoji ?? "🎮"}</span>
            <span className="flex-1 text-sm font-bold" style={{ color: "var(--foreground)" }}>{s.game?.name ?? "Onbekend"}</span>
            {s.winner ? (
              <span className="text-sm font-extrabold" style={{ color: "var(--color-coral)" }}>{s.winner.emoji} {s.winner.name}</span>
            ) : (
              <span className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>🤝 Gelijk</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarathonHistoryClient() {
  const { history, isLoading } = useMarathonHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <MarathonDetailView id={selectedId} onClose={() => setSelectedId(null)} />;
  }

  // All-time stats
  const allWins: Record<string, { name: string; emoji: string; count: number }> = {};
  for (const s of history) {
    if (s.winner && !s.marathon.is_active) {
      const p = s.winner;
      if (!allWins[p.id]) allWins[p.id] = { name: p.name, emoji: p.emoji, count: 0 };
      allWins[p.id]!.count++;
    }
  }
  const topWinner = Object.values(allWins).sort((a, b) => b.count - a.count)[0] ?? null;
  const finishedCount = history.filter(m => !m.marathon.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>Marathon-historie 📜</h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Alle spellenavonden
        </p>
      </div>

      {/* All-time stats */}
      {finishedCount > 0 && (
        <div
          className="rounded-3xl p-4 space-y-2"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>All-time stats</p>
          <div className="flex gap-4 text-sm font-bold">
            <div>
              <span className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{finishedCount}</span>
              <p style={{ color: "var(--muted-foreground)" }}>marathons</p>
            </div>
            {topWinner && (
              <div>
                <span className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{topWinner.emoji} {topWinner.name}</span>
                <p style={{ color: "var(--muted-foreground)" }}>meeste overwinningen ({topWinner.count}×)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-2xl">⏳</div>
      )}

      {!isLoading && history.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <span className="text-5xl">🏁</span>
          <p className="font-bold" style={{ color: "var(--muted-foreground)" }}>Nog geen marathons gespeeld</p>
          <Link href="/" className="inline-block px-5 py-2.5 rounded-2xl font-black text-white" style={{ backgroundColor: "var(--color-coral)" }}>
            Start je eerste marathon
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {history.map((summary) => (
          <MarathonCard
            key={summary.marathon.id}
            summary={summary}
            onSelect={() => setSelectedId(summary.marathon.id)}
          />
        ))}
      </div>
    </div>
  );
}
