"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Game } from "@/lib/schemas";

interface Candidate {
  bggId: number;
  name: string;
  yearPublished: number | null;
  score: number;
}

interface MetadataRefreshProps {
  game: Pick<Game, "id" | "name">;
}

/**
 * "Ververs metadata" plus de handmatige spelkiezer.
 *
 * Die kiezer is hier geen randgeval: veel spellen in deze lijst hebben een
 * Nederlandse titel terwijl BoardGameGeek Engelstalig is, dus automatisch matchen
 * lukt lang niet altijd.
 */
export function MetadataRefresh({ game }: MetadataRefreshProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState(game.name);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function enrich(bggId?: number) {
    setBusy(true);
    try {
      const response = await fetch(`/api/games/${game.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bggId ? JSON.stringify({ bggId }) : "",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error ?? "Ophalen mislukt");
        return;
      }

      if (payload?.status === "no_match") {
        toast.error("Geen BGG-match gevonden. Kies zelf het juiste spel.");
        setPickerOpen(true);
        void loadCandidates(query);
        return;
      }

      toast.success(
        payload?.matchedName
          ? `🖼️ Gekoppeld aan ${payload.matchedName}`
          : "🖼️ Metadata opgehaald"
      );
      setPickerOpen(false);
      router.refresh();
    } catch {
      toast.error("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  async function loadCandidates(searchTerm: string) {
    setSearching(true);
    try {
      const response = await fetch(
        `/api/games/${game.id}/bgg-candidates?q=${encodeURIComponent(searchTerm)}`
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error ?? "Zoeken mislukt");
        setCandidates([]);
        return;
      }
      setCandidates(payload?.candidates ?? []);
    } catch {
      toast.error("Zoeken mislukt");
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => void enrich()}
          disabled={busy}
          className="px-3 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)] disabled:opacity-60 disabled:cursor-wait"
        >
          {busy ? "⏳ Ophalen… dit duurt even" : "🔄 Ververs metadata"}
        </button>
        <button
          onClick={() => {
            const next = !pickerOpen;
            setPickerOpen(next);
            if (next && candidates === null) void loadCandidates(query);
          }}
          className="text-xs font-bold cursor-pointer hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          Verkeerd spel?
        </button>
      </div>

      {pickerOpen && (
        <div className="rounded-2xl border p-3 space-y-2 bg-[var(--card)]">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadCandidates(query);
              }}
              placeholder="Zoek op BoardGameGeek…"
              className="flex-1 px-3 py-2 rounded-xl border text-sm font-semibold bg-transparent"
            />
            <button
              onClick={() => void loadCandidates(query)}
              disabled={searching}
              className="px-3 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)] disabled:opacity-60"
            >
              {searching ? "…" : "Zoek"}
            </button>
          </div>

          {candidates !== null && candidates.length === 0 && !searching && (
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Niets gevonden. Probeer de Engelse of Duitse titel — veel spellen staan op
              BoardGameGeek onder hun oorspronkelijke naam.
            </p>
          )}

          <div className="space-y-1">
            {candidates?.map((candidate) => (
              <button
                key={candidate.bggId}
                onClick={() => void enrich(candidate.bggId)}
                disabled={busy}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer hover:bg-[var(--muted)] disabled:opacity-60"
              >
                {candidate.name}
                {candidate.yearPublished ? (
                  <span style={{ color: "var(--muted-foreground)" }}> ({candidate.yearPublished})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
