"use client";

import useSWR from "swr";
import type { Game } from "@/lib/schemas";

import { jsonFetcher } from "./fetcher";

export function useGames() {
  const { data, error, isLoading, mutate } = useSWR<Game[]>(
    "/api/games",
    jsonFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );
  return { games: data ?? [], error, isLoading, mutate };
}
