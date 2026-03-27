"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PeriodFilter, StatsResponse, Game } from "@/lib/schemas";
import { PeriodFilterTabs } from "./period-filter";
import { Leaderboard } from "./leaderboard";
import { StreakCards } from "./streak-cards";
import { RecentGames } from "./recent-games";
import { GameFilter } from "./game-filter";
import { ScoreStats } from "./score-stats";
import { LazyInView } from "@/components/ui/lazy-in-view";
import { useDashboardStats } from "@/lib/hooks";

// Lazy-load heavy chart components — only fetched when in view, no SSR
const TopGamesChart = dynamic(
  () => import("./top-games-chart").then((m) => ({ default: m.TopGamesChart })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border p-4 h-48 flex items-center justify-center text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
        Grafiek laden…
      </div>
    ),
  }
);

const DayOfWeekChart = dynamic(
  () => import("./day-of-week-chart").then((m) => ({ default: m.DayOfWeekChart })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border p-4 h-48 flex items-center justify-center text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
        Grafiek laden…
      </div>
    ),
  }
);

interface DashboardClientProps {
  initialStats: StatsResponse;
  games: Game[];
}

export function DashboardClient({ initialStats, games }: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [gameId, setGameId] = useState<string>("");

  const { stats, isLoading } = useDashboardStats(period, gameId);
  const displayStats = stats ?? initialStats;

  const selectedGame = games.find((g) => g.id === gameId);

  return (
    <div
      className="space-y-6 transition-opacity"
      style={{ opacity: isLoading ? 0.6 : 1 }}
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
      {/* Op tablet: leaderboard + streaks naast elkaar, charts naast elkaar */}
      <div className="md:grid md:grid-cols-2 md:gap-6">
        <div className="space-y-6">
          <Leaderboard leaderboard={displayStats.leaderboard} />
          <StreakCards leaderboard={displayStats.leaderboard} />
        </div>
        <div className="space-y-6 mt-6 md:mt-0">
          <LazyInView>
            <TopGamesChart topGames={displayStats.top_games} />
          </LazyInView>
          <LazyInView>
            <DayOfWeekChart />
          </LazyInView>
        </div>
      </div>
      <LazyInView>
        <ScoreStats gameId={gameId} period={period} />
      </LazyInView>
      <RecentGames sessions={displayStats.recent_sessions} />
    </div>
  );
}
