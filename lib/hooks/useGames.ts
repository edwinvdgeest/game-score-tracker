"use client";

import useSWR from "swr";
import type { Game } from "@/lib/schemas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGames() {
  const { data, error, isLoading, mutate } = useSWR<Game[]>(
    "/api/games",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    }
  );
  return { games: data ?? [], error, isLoading, mutate };
}
