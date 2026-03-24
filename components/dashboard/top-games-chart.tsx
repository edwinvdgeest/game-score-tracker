"use client";

import type { TopGame } from "@/lib/schemas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopGamesChartProps {
  topGames: TopGame[];
}

const COLORS = ["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE", "#FF8E8E", "#4ECDC4", "#FFE66D", "#FF6B6B"];

export function TopGamesChart({ topGames }: TopGamesChartProps) {
  if (topGames.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-extrabold mb-3">📊 Meest gespeeld</h2>
        <div
          className="text-center py-8 font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Nog geen spellen gespeeld
        </div>
      </div>
    );
  }

  const data = topGames.slice(0, 8).map((tg) => ({
    name: tg.game.emoji + " " + tg.game.name.split(" ")[0],
    count: tg.play_count,
  }));

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">📊 Meest gespeeld</h2>
      <div className="bg-white rounded-2xl border p-3">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 40, left: -20 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fontWeight: 700 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${String(value)}x`, "Gespeeld"]}
              contentStyle={{
                borderRadius: "12px",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length] ?? "#FF6B6B"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
