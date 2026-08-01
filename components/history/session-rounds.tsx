"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Player } from "@/lib/schemas";
import type { SessionRoundDetail } from "@/lib/queries";
import { jsonFetcher } from "@/lib/hooks/fetcher";

interface SessionRoundsProps {
  sessionId: string;
  /** De deelnemers van dit potje, in de volgorde waarin de scores getoond worden. */
  players: Player[];
  /** Gewonnen rondes tellen als 1/0, dus dan tonen we een 🏆 in plaats van een getal. */
  winnerFormat: boolean;
}

/**
 * Het rondeverloop van één potje, uitklapbaar.
 *
 * Pas ophalen als je 'm openklapt: /api/sessions levert alleen een telling, want die
 * lijst gaat over alle potjes en wordt gecachet.
 *
 * Bewerken kan hier niet. Corrigeer je een totaal in het formulier hierboven, dan gooit
 * de server de rondes weg — ze zouden anders optellen tot iets anders dan het totaal.
 */
export function SessionRounds({ sessionId, players, winnerFormat }: SessionRoundsProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<{ rounds: SessionRoundDetail[] }>(
    open ? `/api/sessions/${sessionId}/rounds` : null,
    jsonFetcher,
    { revalidateOnFocus: false }
  );

  const rounds = data?.rounds ?? [];
  const numbers = [...new Set(rounds.map((r) => r.round_number))].sort((a, b) => a - b);

  const scoreFor = (roundNumber: number, playerId: string) =>
    rounds.find((r) => r.round_number === roundNumber && r.player_id === playerId)?.score ?? null;

  return (
    <div className="px-3 pb-3 md:px-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold cursor-pointer"
        style={{ color: "var(--muted-foreground)" }}
        aria-expanded={open}
      >
        🔢 Rondes {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 overflow-x-auto">
          {isLoading && (
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Ophalen…
            </p>
          )}
          {!isLoading && numbers.length > 0 && (
            <table className="text-xs font-semibold">
              <thead>
                <tr style={{ color: "var(--muted-foreground)" }}>
                  <th className="pr-3 text-left font-bold">#</th>
                  {players.map((player) => (
                    <th key={player.id} className="px-2 text-right font-bold">
                      {player.emoji}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numbers.map((number) => (
                  <tr key={number}>
                    <td className="pr-3" style={{ color: "var(--muted-foreground)" }}>
                      {number}
                    </td>
                    {players.map((player) => {
                      const score = scoreFor(number, player.id);
                      return (
                        <td key={player.id} className="px-2 text-right tabular-nums">
                          {winnerFormat ? (score === 1 ? "🏆" : "–") : (score ?? "–")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
