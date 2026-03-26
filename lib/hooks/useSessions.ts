"use client";

import useSWR from "swr";
import type { SessionDetail } from "@/lib/queries";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<SessionDetail[]>(
    "/api/sessions",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  );
  return { sessions: data ?? [], error, isLoading, mutate };
}
