"use client";

import { useState } from "react";
import type { SeasonStandingsResponse } from "@/lib/queries";
import type { SeasonRef } from "@/lib/seasons";
import { isSameSeason, seasonLabel } from "@/lib/seasons";
import { useSeasonHistory, useSeasonStandings } from "@/lib/hooks/useSeasons";
import { SeasonPicker } from "./season-picker";
import { SeasonStandings } from "./season-standings";
import { TrophyCabinet } from "./trophy-cabinet";

interface SeasonsClientProps {
  initialSeason: SeasonStandingsResponse;
  /** Alle seizoenen waarin gespeeld is, nieuwste eerst. */
  seasons: SeasonRef[];
}

export function SeasonsClient({ initialSeason, seasons }: SeasonsClientProps) {
  const [selected, setSelected] = useState<SeasonRef>(initialSeason.season);

  const isInitial = isSameSeason(selected, initialSeason.season);
  const { season, isLoading } = useSeasonStandings(selected);
  const { seasons: history } = useSeasonHistory();

  const display = season ?? (isInitial ? initialSeason : null);

  // Het huidige seizoen staat altijd in de lijst, ook als er nog niet in gespeeld is.
  const pickerSeasons = seasons.some((ref) =>
    isSameSeason(ref, initialSeason.season)
  )
    ? seasons
    : [initialSeason.season, ...seasons];

  return (
    <div
      className="space-y-6 transition-opacity"
      style={{ opacity: isLoading && !display ? 0.6 : 1 }}
    >
      <SeasonPicker
        seasons={pickerSeasons}
        selected={selected}
        onSelect={setSelected}
      />

      {!display ? (
        <div className="flex items-center justify-center py-16 text-4xl">🏆</div>
      ) : (
        <>
          <div>
            <h2 className="font-extrabold text-base">{seasonLabel(display.season)}</h2>
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              {display.isCurrent
                ? "Dit seizoen loopt nog — de stand kan nog omslaan"
                : "Afgesloten seizoen"}
              {" · "}
              {display.sessionCount}{" "}
              {display.sessionCount === 1 ? "potje" : "potjes"}
            </p>
          </div>

          <SeasonStandings
            standings={display.standings}
            champion={display.champion}
            isCurrent={display.isCurrent}
          />
        </>
      )}

      {history && <TrophyCabinet seasons={history} onSelect={setSelected} />}
    </div>
  );
}
