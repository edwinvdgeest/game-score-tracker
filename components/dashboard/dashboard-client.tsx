"use client";

import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, StatsResponse } from "@/lib/schemas";
import { PeriodFilterTabs } from "./period-filter";
import { Leaderboard } from "./leaderboard";
import { StreakCards } from "./streak-cards";
import { TopGamesChart } from "./top-games-chart";
import { RecentGames } from "./recent-games";
import { DayOfWeekChart } from "./day-of-week-chart";

interface DashboardClientProps {
  initialStats: StatsResponse;
}

export function DashboardClient({ initialStats }: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?period=${p}`);
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
    if (period !== "all") {
      void fetchStats(period);
    } else {
      setStats(initialStats);
    }
  }, [period, fetchStats, initialStats]);

  return (
    <div
      className="space-y-6 transition-opacity"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      <PeriodFilterTabs value={period} onChange={setPeriod} />
      <Leaderboard leaderboard={stats.leaderboard} />
      <StreakCards leaderboard={stats.leaderboard} />
      <TopGamesChart topGames={stats.top_games} />
      <DayOfWeekChart />
      <RecentGames sessions={stats.recent_sessions} />
    </div>
  );
}
