"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DayOfWeekStat } from "@/lib/queries";
import type { Player } from "@/lib/schemas";

type DayStats = { stats: DayOfWeekStat[]; players: Player[] };

const COLORS = ["#ff6b6b", "#4ecdc4", "#a29bfe", "#ffe66d"];

export function DayOfWeekChart() {
  const [data, setData] = useState<DayStats | null>(null);

  useEffect(() => {
    fetch("/api/stats/days")
      .then((r) => r.json())
      .then((d: DayStats) => setData(d))
      .catch(() => null);
  }, []);

  if (!data) {
    return (
      <div className="rounded-3xl p-4 border" style={{ backgroundColor: "var(--card)" }}>
        <h2 className="font-extrabold text-base mb-3">📅 Speeldag analyse</h2>
        <div className="h-32 flex items-center justify-center text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Laden...
        </div>
      </div>
    );
  }

  const { stats, players } = data;
  const totalSessions = stats.reduce((s, d) => s + d.sessions, 0);

  if (totalSessions === 0) return null;

  // Chart data: sessions per day, sorted Mo-Su (start from Monday = 1)
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((i) => stats[i]).filter(Boolean) as DayOfWeekStat[];
  const chartData = ordered.map((d) => ({ name: d.dayLabel, sessies: d.sessions }));

  // Per player: which day has most wins?
  const playerBestDay = players.map((player) => {
    let bestDay = -1;
    let bestCount = 0;
    for (const day of stats) {
      const wins = day.winsByPlayer[player.id] ?? 0;
      if (wins > bestCount) {
        bestCount = wins;
        bestDay = day.day;
      }
    }
    return { player, bestDay, bestCount };
  });

  return (
    <div className="rounded-3xl p-4 border space-y-4" style={{ backgroundColor: "var(--card)" }}>
      <h2 className="font-extrabold text-base">📅 Speeldag analyse</h2>

      {/* Bar chart */}
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value} potjes`, "Gespeeld"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="sessies" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.sessies === Math.max(...chartData.map((d) => d.sessies), 0) ? "#ff6b6b" : "#e8e0d4"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Beste dag per speler */}
      {playerBestDay.some((p) => p.bestCount > 0) && (
        <div className="space-y-2">
          <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
            Beste dag per speler
          </div>
          {playerBestDay
            .filter((p) => p.bestCount > 0)
            .map(({ player, bestDay, bestCount }) => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-lg">{player.emoji}</span>
                <span className="font-bold text-sm flex-1">{player.name}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                  Wint het meest op{" "}
                  <span className="font-black" style={{ color: COLORS[players.indexOf(player) % COLORS.length] }}>
                    {stats[bestDay]?.dayLabel ?? ""}
                  </span>{" "}
                  ({bestCount}×)
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
