"use client";

import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, StatsResponse, Game } from "@/lib/schemas";
import { PeriodFilterTabs } from "./period-filter";
import { Leaderboard } from "./leaderboard";
import { StreakCards } from "./streak-cards";
import { TopGamesChart } from "./top-games-chart";
import { RecentGames } from "./recent-games";
import { DayOfWeekChart } from "./day-of-week-chart";
import { GameFilter } from "./game-filter";

interface DashboardClientProps {
  initialStats: StatsResponse;
  games: Game[];
}

export function DashboardClient({ initialStats, games }: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [gameId, setGameId] = useState<string>("");
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (p: PeriodFilter, gid: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: p });
      if (gid) params.set("game_id", gid);
      const res = await fetch(`/api/stats?${params.toString()}`);
      if (!res.ok) throw new Error("Laden mislukt");
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch {
      // Keep existing stats on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period !== "all" || gameId) {
      void fetchStats(period, gameId);
    } else {
      setStats(initialStats);
    }
  }, [period, gameId, fetchStats, initialStats]);

  const selectedGame = games.find((g) => g.id === gameId);

  return (
    <div
      className="space-y-6 transition-opacity"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      <GameFilter games={games} value={gameId} onChange={setGameId} />
      <PeriodFilterTabs value={period} onChange={setPeriod} />
      {selectedGame && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: "var(--color-warm-gray)" }}
        >
          <span className="text-xl">{selectedGame.emoji}</span>
          <span>Gefilterd op: {selectedGame.name}</span>
          <button
            onClick={() => setGameId("")}
            className="ml-auto text-xs font-bold cursor-pointer hover:underline"
            style={{ color: "var(--color-coral)" }}
          >
            Wis filter ✕
          </button>
        </div>
      )}
      <Leaderboard leaderboard={stats.leaderboard} />
      <StreakCards leaderboard={stats.leaderboard} />
      <TopGamesChart topGames={stats.top_games} />
      <DayOfWeekChart />
      <RecentGames sessions={stats.recent_sessions} />
    </div>
  );
}
