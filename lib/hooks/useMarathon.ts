"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { Marathon } from "@/lib/schemas";
import type { MarathonDetail, MarathonSummary } from "@/lib/queries";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Actieve marathon (of null) */
export function useActiveMarathon() {
  const { data, error, isLoading, mutate } = useSWR<Marathon | null>(
    "/api/marathon",
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5_000 }
  );
  return { marathon: data ?? null, error, isLoading, mutate };
}

/** Gedetailleerde data voor een specifieke marathon */
export function useMarathonDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MarathonDetail>(
    id ? `/api/marathon/${id}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 10_000, dedupingInterval: 5_000 }
  );
  return { detail: data ?? null, error, isLoading, mutate };
}

/** Marathon-overzicht (history) */
export function useMarathonHistory() {
  const { data, error, isLoading, mutate } = useSWR<MarathonSummary[]>(
    "/api/marathon/history",
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );
  return { history: data ?? [], error, isLoading, mutate };
}

/** Start een nieuwe marathon */
export async function startMarathon(name: string): Promise<Marathon> {
  const response = await fetch("/api/marathon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Kon marathon niet starten");
  const marathon = (await response.json()) as Marathon;
  await globalMutate("/api/marathon");
  return marathon;
}

/** Beëindig een marathon */
export async function finishMarathon(id: string): Promise<Marathon> {
  const response = await fetch(`/api/marathon/${id}`, { method: "PATCH" });
  if (!response.ok) throw new Error("Kon marathon niet beëindigen");
  const marathon = (await response.json()) as Marathon;
  await globalMutate("/api/marathon");
  await globalMutate("/api/marathon/history");
  return marathon;
}
