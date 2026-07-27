"use client";

import useSWR from "swr";
import type { SeasonStandingsResponse } from "@/lib/queries";
import type { SeasonRef } from "@/lib/seasons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const options = {
  revalidateOnFocus: true,
  dedupingInterval: 10_000,
  keepPreviousData: true,
};

/** De stand van een seizoen. Zonder ref: het seizoen dat nu loopt. */
export function useSeasonStandings(ref?: SeasonRef | null) {
  const key = ref
    ? `/api/seasons?year=${ref.year}&quarter=${ref.quarter}`
    : "/api/seasons";

  const { data, error, isLoading, mutate } = useSWR<SeasonStandingsResponse>(
    key,
    fetcher,
    options
  );

  return { season: data, error, isLoading, mutate };
}

/** Elk seizoen met zijn stand en kampioen, nieuwste eerst. */
export function useSeasonHistory() {
  const { data, error, isLoading, mutate } = useSWR<SeasonStandingsResponse[]>(
    "/api/seasons?history=1",
    fetcher,
    options
  );

  return { seasons: data, error, isLoading, mutate };
}
