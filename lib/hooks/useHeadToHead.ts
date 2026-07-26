"use client";

import useSWR from "swr";
import type { HeadToHeadResponse } from "@/lib/queries";
import type { PeriodFilter } from "@/lib/schemas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useHeadToHead(
  playerAId: string | null,
  playerBId: string | null,
  period: PeriodFilter = "all"
) {
  const key =
    playerAId && playerBId && playerAId !== playerBId
      ? `/api/duel?a=${playerAId}&b=${playerBId}&period=${period}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<HeadToHeadResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return { duel: data, error, isLoading, mutate };
}
