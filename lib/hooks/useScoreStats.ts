"use client";

import useSWR from "swr";
import type { ScoreStatsResponse } from "@/lib/queries";
import type { PeriodFilter } from "@/lib/schemas";

import { jsonFetcher } from "./fetcher";

export function useScoreStats(period: PeriodFilter = "all", gameId = "") {
  const params = new URLSearchParams({ period });
  if (gameId) params.set("game_id", gameId);

  const { data, error, isLoading, mutate } = useSWR<ScoreStatsResponse>(
    `/api/stats/scores?${params.toString()}`,
    jsonFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return { scoreStats: data, error, isLoading, mutate };
}
