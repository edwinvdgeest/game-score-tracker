"use client";

import useSWR from "swr";
import type { PeriodFilter, StatsResponse } from "@/lib/schemas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDashboardStats(
  period: PeriodFilter = "all",
  gameId = ""
) {
  const params = new URLSearchParams({ period });
  if (gameId) params.set("game_id", gameId);

  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    `/api/stats?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return { stats: data, error, isLoading, mutate };
}
