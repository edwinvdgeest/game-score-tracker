"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ScoreStatsResponse } from "@/lib/queries";
import type { PeriodFilter } from "@/lib/schemas";
import { formatShortDate } from "@/lib/utils";

const PLAYER_COLORS = ["#ff6b6b", "#4ecdc4", "#a29bfe", "#ffe66d", "#95e1d3", "#fd79a8"];

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

  if (loading) {
    return (
      <div className="rounded-3xl border p-4 h-24 flex items-center justify-center text-sm font-semibold" style={{ color: "var(--muted-foreground)", backgroundColor: "var(--card)" }}>
        Score stats laden…
      </div>
    );
  }

  if (!data || !data.has_scores) return null;

  const { hall_of_fame, avg_scores, score_trend, biggest_margin } = data;

  // Build line chart data: one entry per session, keyed by player name
  const allPlayerNames = Array.from(
    new Set(score_trend.flatMap((s) => s.scores.map((p) => p.name)))
  );
  const chartData = score_trend.map((s) => {
    const entry: Record<string, string | number> = { date: formatShortDate(s.played_at) };
    for (const p of s.scores) {
      entry[p.name] = p.score;
    }
    return entry;
  });

  return (
    <div className="space-y-4">
      {/* Hall of Fame */}
      {hall_of_fame.length > 0 && (
        <div className="rounded-3xl border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <h2 className="font-extrabold text-base">🏆 Hall of Fame</h2>
          <div className="space-y-2">
            {hall_of_fame.map((entry, i) => (
              <div key={`${entry.player.id}-${i}`} className="flex items-center gap-3">
                <span className="text-lg font-black w-6 text-center" style={{ color: i === 0 ? "#f7b731" : i === 1 ? "#a0a0b0" : i === 2 ? "#cd7f32" : "var(--muted-foreground)" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className="text-xl">{entry.player.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm">{entry.player.name}</span>
                  {!gameId && (
                    <span className="text-xs font-semibold ml-2" style={{ color: "var(--muted-foreground)" }}>
                      {entry.game.emoji} {entry.game.name}
                    </span>
                  )}
                </div>
                <span className="font-black text-lg" style={{ color: "var(--color-coral)" }}>
                  {entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avg scores */}
      {avg_scores.length > 0 && (
        <div className="rounded-3xl border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <h2 className="font-extrabold text-base">📊 Gemiddelde scores</h2>
          <div className="space-y-2">
            {avg_scores.map((entry, i) => {
              const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
              const maxAvg = avg_scores[0]?.avg_score ?? 1;
              const barWidth = maxAvg > 0 ? Math.round((entry.avg_score / maxAvg) * 100) : 0;
              return (
                <div key={entry.player.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{entry.player.emoji}</span>
                    <span className="font-bold text-sm flex-1">{entry.player.name}</span>
                    <span className="font-black text-sm" style={{ color }}>
                      ⌀ {entry.avg_score}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      (max {entry.max_score})
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-warm-gray)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Gebaseerd op {avg_scores[0]?.session_count ?? 0}+ gespeelde potjes
          </p>
        </div>
      )}

      {/* Score trend line chart — only when enough data */}
      {chartData.length >= 2 && allPlayerNames.length > 0 && (
        <div className="rounded-3xl border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <h2 className="font-extrabold text-base">📈 Score verloop</h2>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }}
                />
                {allPlayerNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Biggest margin */}
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
