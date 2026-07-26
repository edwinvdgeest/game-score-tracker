"use client";

import type { Player } from "@/lib/schemas";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

interface FinalScoresProps {
  players: Player[];
  scores: Record<string, string>;
  winnerId: string | null;
  lowestScoreWins?: boolean;
}

/** Eindstand van het potje: gesorteerd, met verschil t.o.v. de winnaar */
export function FinalScores({
  players,
  scores,
  winnerId,
  lowestScoreWins = false,
}: FinalScoresProps) {
  const rows = players
    .map((p) => ({ player: p, score: parseInt(scores[p.id] ?? "", 10) }))
    .filter((r) => !isNaN(r.score))
    .sort((a, b) => (lowestScoreWins ? a.score - b.score : b.score - a.score));

  if (rows.length === 0) return null;

  const leader = rows[0]!.score;

  return (
    <div className="w-full max-w-xs space-y-1.5">
      <p
        className="text-xs font-bold uppercase tracking-wide text-left"
        style={{ color: "var(--muted-foreground)" }}
      >
        Eindstand
      </p>
      {rows.map((row, i) => {
        const isWinner = row.player.id === winnerId;
        const gap = Math.abs(row.score - leader);
        return (
          <div
            key={row.player.id}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2"
            style={{
              borderColor: isWinner
                ? "color-mix(in srgb, var(--color-coral) 50%, transparent)"
                : "var(--border)",
              backgroundColor: isWinner
                ? "color-mix(in srgb, var(--color-coral) 10%, var(--card))"
                : "var(--card)",
              animation: `score-row-in 0.35s ease-out ${i * 70}ms both`,
            }}
          >
            <span className="text-sm w-5 text-center">
              {RANK_MEDALS[i] ?? `${i + 1}.`}
            </span>
            <span className="text-lg leading-none">{row.player.emoji}</span>
            <span className="flex-1 text-left font-bold text-sm truncate">
              {row.player.name}
            </span>
            {gap > 0 && (
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {lowestScoreWins ? `+${gap}` : `−${gap}`}
              </span>
            )}
            <span
              className="font-black text-sm w-10 text-right"
              style={{ color: isWinner ? "var(--color-coral)" : "var(--foreground)" }}
            >
              {row.score}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes score-row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
