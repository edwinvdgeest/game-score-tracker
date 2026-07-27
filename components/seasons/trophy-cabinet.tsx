"use client";

import type { SeasonStandingsResponse } from "@/lib/queries";
import type { SeasonRef } from "@/lib/seasons";
import { seasonLabel } from "@/lib/seasons";

interface TrophyCabinetProps {
  seasons: SeasonStandingsResponse[];
  onSelect: (ref: SeasonRef) => void;
}

export function TrophyCabinet({ seasons, onSelect }: TrophyCabinetProps) {
  // Alleen afgesloten seizoenen: het huidige heeft nog geen kampioen.
  const finished = seasons.filter((s) => !s.isCurrent && s.sessionCount > 0);
  if (finished.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-extrabold">🏆 Trofeeënkast</h2>
      <div className="space-y-2">
        {finished.map((season) => (
          <button
            key={`${season.season.year}-${season.season.quarter}`}
            type="button"
            onClick={() => onSelect(season.season)}
            className="w-full text-left p-3 rounded-2xl border space-y-2 cursor-pointer transition-colors hover:border-[var(--color-coral)]"
            style={{ backgroundColor: "var(--card)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-extrabold text-sm">{seasonLabel(season.season)}</p>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  🎮 {season.sessionCount}{" "}
                  {season.sessionCount === 1 ? "potje" : "potjes"}
                </p>
              </div>
              {season.champion ? (
                <div
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-black"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-warm-yellow) 20%, var(--card))",
                    color: "var(--foreground)",
                  }}
                >
                  🥇 {season.champion.player.emoji} {season.champion.player.name}
                </div>
              ) : (
                <div
                  className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-black"
                  style={{
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  🤝 Gedeeld
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
