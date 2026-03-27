"use client";

import { useEffect, useState } from "react";
import type { ScoreStatsResponse } from "@/lib/queries";
import type { PeriodFilter } from "@/lib/schemas";
import { formatShortDate } from "@/lib/utils";

interface ScoreStatsProps {
  gameId: string;
  period: PeriodFilter;
}

export function ScoreStats({ gameId, period }: ScoreStatsProps) {
  const [data, setData] = useState<ScoreStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (gameId) params.set("game_id", gameId);
    fetch(`/api/stats/scores?${params}`)
      .then((r) => r.json())
      .then((d: ScoreStatsResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId, period]);

  if (loading || !data || !data.has_scores) return null;

  const { hall_of_fame, biggest_margin } = data;

  const showHallOfFame = hall_of_fame.length > 0 && gameId;

  if (!showHallOfFame && (!biggest_margin || biggest_margin.margin === 0)) return null;

  return (
    <div className="space-y-4">
      {/* Hall of Fame — persoonlijk record per speler (alleen bij spelfilter) */}
      {showHallOfFame && (
        <div className="rounded-3xl border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <h2 className="font-extrabold text-base">🏆 Persoonlijk record</h2>
          <div className="space-y-2">
            {hall_of_fame.map((entry, i) => (
              <div key={`${entry.player.id}-${i}`} className="flex items-center gap-3">
                <span className="w-6 text-center text-base">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className="text-xl">{entry.player.emoji}</span>
                <span className="font-bold text-sm flex-1">{entry.player.name}</span>
                <span className="font-black text-lg" style={{ color: "var(--color-coral)" }}>
                  {entry.score}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                  {formatShortDate(entry.played_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grootste verschil — met scores breakdown */}
      {biggest_margin && biggest_margin.margin > 0 && (
        <div className="rounded-3xl border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <h2 className="font-extrabold text-base">💥 Grootste verschil</h2>
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          >
            <span className="text-2xl">{biggest_margin.game.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm">{biggest_margin.game.name}</div>
              <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                {formatShortDate(biggest_margin.played_at)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-base" style={{ color: "var(--color-coral)" }}>
                +{biggest_margin.margin} punten
              </div>
              <div className="text-xs font-bold">
                {biggest_margin.winner_emoji} {biggest_margin.winner_name} won
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {biggest_margin.scores.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: "var(--color-warm-gray)",
                  color: i === 0 ? "var(--color-coral)" : "var(--muted-foreground)",
                }}
              >
                <span>{s.emoji}</span>
                <span>{s.name}</span>
                <span className="font-black">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
