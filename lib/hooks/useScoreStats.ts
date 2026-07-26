"use client";

import useSWR from "swr";
import type { ScoreStatsResponse } from "@/lib/queries";
import type { PeriodFilter } from "@/lib/schemas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useScoreStats(period: PeriodFilter = "all", gameId = "") {
  const params = new URLSearchParams({ period });
  if (gameId) params.set("game_id", gameId);

  const { data, error, isLoading, mutate } = useSWR<ScoreStatsResponse>(
    `/api/stats/scores?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return { scoreStats: data, error, isLoading, mutate };
}
