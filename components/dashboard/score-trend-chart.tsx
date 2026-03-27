"use client";

import type { StatsResponse } from "@/lib/schemas";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatShortDate } from "@/lib/utils";

type ScoreTrend = NonNullable<StatsResponse["score_trend"]>;

interface ScoreTrendChartProps {
  trend: ScoreTrend;
}

const PLAYER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#A29BFE",
  "#FF8E8E",
  "#74B9FF",
];

export function ScoreTrendChart({ trend }: ScoreTrendChartProps) {
  if (trend.length === 0) return null;

  // Collect unique players across all entries
  const playerMap = new Map<string, { id: string; name: string; emoji: string }>();
  for (const entry of trend) {
    for (const { player } of entry.scores) {
      if (!playerMap.has(player.id)) {
        playerMap.set(player.id, player);
      }
    }
  }
  const players = Array.from(playerMap.values());

  // Build chart data: one row per session
  const data = trend.map((entry) => {
    const row: Record<string, unknown> = {
      date: formatShortDate(entry.played_at),
    };
    for (const { player, score } of entry.scores) {
      row[player.id] = score;
    }
    return row;
  });

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">📈 Score verloop</h2>
      <div
        className="rounded-2xl border p-3"
        style={{ backgroundColor: "var(--card)" }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fontWeight: 700 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => {
                const player = playerMap.get(name as string);
                const label = player ? `${player.emoji} ${player.name}` : (name as string);
                return [String(value), label];
              }}
              contentStyle={{
                borderRadius: "12px",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
              }}
            />
            <Legend
              formatter={(value) => {
                const player = playerMap.get(value);
                return player ? `${player.emoji} ${player.name}` : value;
              }}
              wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
            />
            {players.map((player, i) => (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.id}
                stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
