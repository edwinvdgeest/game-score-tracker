"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { EditGameForm } from "@/components/games/edit-game-form";
import { formatDate } from "@/lib/utils";
import type { GameDetailStats, StarterStat } from "@/lib/queries";

const COLORS = ["#ff6b6b", "#4ecdc4", "#a29bfe", "#ffe66d"];

interface GameDetailClientProps {
  stats: GameDetailStats;
  starterStat: StarterStat | null;
}

export function GameDetailClient({ stats, starterStat }: GameDetailClientProps) {
  const [editing, setEditing] = useState(false);

  const { game, totalSessions, lastPlayedAt, avgDuration, winnerStats, recentSessions } = stats;

  const chartData = winnerStats.map((ws) => ({
    name: `${ws.player.emoji} ${ws.player.name}`,
    wins: ws.wins,
    percentage: ws.winPercentage,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-5xl mb-1">{game.emoji}</div>
          <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
            {game.name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
            >
              {game.category}
            </span>
            {game.min_players && game.max_players && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
              >
                👥 {game.min_players}–{game.max_players}
              </span>
            )}
            {game.difficulty && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
                title={`Moeilijkheid: ${game.difficulty}/5`}
              >
                {"⭐".repeat(game.difficulty)}{"☆".repeat(5 - game.difficulty)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/?game=${game.id}`}
            className="px-4 py-2 rounded-xl font-black text-sm text-white flex items-center gap-1.5"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            🎮 Score loggen
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)] flex items-center gap-1"
          >
            ✏️ Bewerken
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <EditGameForm game={game} onClose={() => setEditing(false)} />
      )}

      {/* Stat kaarten */}
      <div className={`grid gap-3 ${avgDuration ? "grid-cols-3" : "grid-cols-2"}`}>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "var(--color-warm-gray)" }}
        >
          <div className="text-3xl font-black" style={{ color: "var(--color-coral)" }}>
            {totalSessions}
          </div>
          <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
            keer gespeeld
          </div>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "var(--color-warm-gray)" }}
        >
          <div className="text-sm font-black" style={{ color: "var(--color-coral)" }}>
            {lastPlayedAt ? formatDate(lastPlayedAt) : "Nooit"}
          </div>
          <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
            laatste keer
          </div>
        </div>
        {avgDuration && (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          >
            <div className="text-2xl font-black" style={{ color: "var(--color-coral)" }}>
              {avgDuration}m
            </div>
            <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
              gem. duur
            </div>
          </div>
        )}
      </div>

      {/* Beginner-voordeel */}
      {starterStat && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: "var(--color-warm-gray)" }}
        >
          <span className="text-3xl">🎯</span>
          <div>
            <div className="font-extrabold text-sm">Beginnersvoordeel</div>
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              De beginner wint{" "}
              <span className="font-black" style={{ color: "var(--color-coral)" }}>
                {starterStat.starterWinPercentage}%
              </span>{" "}
              van de potjes ({starterStat.starterWins}/{starterStat.totalWithStarter})
            </div>
          </div>
        </div>
      )}

      {totalSessions > 0 && (
        <>
          {/* Win-verdeling */}
          <div className="bg-[var(--card)] rounded-3xl p-4 border space-y-3">
            <h2 className="font-extrabold text-base">Wie wint het vaakst? 🏆</h2>

            {/* Bar chart */}
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) =>
                      [`${value} keer`, "Gewonnen"]
                    }
                  />
                  <Bar dataKey="wins" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Winnaarslijst */}
            <div className="space-y-2">
              {winnerStats.map((ws, i) => (
                <div key={ws.player.id} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">
                    {i === 0 && ws.wins > 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="text-xl">{ws.player.emoji}</span>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm">{ws.player.name}</div>
                    <div
                      className="w-full rounded-full h-1.5 mt-0.5"
                      style={{ backgroundColor: "var(--color-warm-gray)" }}
                    >
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${ws.winPercentage}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-sm">{ws.wins}x</div>
                    <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                      {ws.winPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recente sessies */}
          <div className="bg-[var(--card)] rounded-3xl p-4 border space-y-3">
            <h2 className="font-extrabold text-base">Recente potjes 📅</h2>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {session.winner ? (
                      <>
                        <span className="text-lg">{session.winner.emoji}</span>
                        <div>
                          <div className="font-bold text-sm">{session.winner.name}</div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            gewonnen
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        className="font-bold text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        🤝 Gelijkspel
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs font-bold"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatDate(session.played_at)}
                    </div>
                    {session.duration_minutes && (
                      <div
                        className="text-xs font-semibold"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        ⏱️ {session.duration_minutes}m
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {totalSessions === 0 && (
        <div
          className="text-center py-8 font-semibold rounded-3xl"
          style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
        >
          Dit spel is nog nooit gespeeld 🎲
        </div>
      )}
    </div>
  );
}
