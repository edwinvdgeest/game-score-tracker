"use client";

import useSWR from "swr";
import type { MemoryToday } from "@/lib/queries";
import { jsonFetcher } from "@/lib/hooks/fetcher";

/**
 * Is er een terugblik van precies vandaag? Draait in de navigatiebalk, dus zuinig: één keer
 * per uur opnieuw ophalen is ruim genoeg voor iets wat om middernacht verandert.
 */
export function useMemoryToday() {
  const { data, error, isLoading } = useSWR<MemoryToday | null>(
    "/api/spotlight/today",
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60 * 60 * 1000 }
  );

  return { memory: data ?? null, error, isLoading };
}
