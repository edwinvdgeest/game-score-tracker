"use client";

import useSWR from "swr";
import type { Player } from "@/lib/schemas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePlayers() {
  const { data, error, isLoading, mutate } = useSWR<Player[]>(
    "/api/players",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
    }
  );
  return { players: data ?? [], error, isLoading, mutate };
}
