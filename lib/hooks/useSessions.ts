"use client";

import useSWR from "swr";
import type { SessionDetail } from "@/lib/queries";

import { jsonFetcher } from "./fetcher";

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<SessionDetail[]>(
    "/api/sessions",
    jsonFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  );
  return { sessions: data ?? [], error, isLoading, mutate };
}
