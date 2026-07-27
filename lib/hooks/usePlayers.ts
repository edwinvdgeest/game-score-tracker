"use client";

import useSWR from "swr";
import type { Player } from "@/lib/schemas";

import { jsonFetcher } from "./fetcher";

export function usePlayers() {
  const { data, error, isLoading, mutate } = useSWR<Player[]>(
    "/api/players",
    jsonFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
    }
  );
  return { players: data ?? [], error, isLoading, mutate };
}
