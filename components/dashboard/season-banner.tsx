"use client";

import Link from "next/link";
import { useSeasonStandings } from "@/lib/hooks/useSeasons";
import { seasonShortLabel } from "@/lib/seasons";

/** Compacte stand van het lopende seizoen, met een link naar de volledige pagina. */
export function SeasonBanner() {
  const { season } = useSeasonStandings();

  // Niks te melden als er in dit kwartaal nog niet gespeeld is.
  if (!season || season.sessionCount === 0) return null;

  const top = season.standings.filter((s) => s.played > 0).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <Link
      href="/seasons"
      className="block rounded-3xl p-4 space-y-2 transition-transform active:scale-[0.99]"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-lavender) 14%, var(--card))",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-extrabold text-base">
          🏆 Seizoen {seasonShortLabel(season.season)}
        </h2>
        <span
          className="text-xs font-bold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {season.sessionCount} {season.sessionCount === 1 ? "potje" : "potjes"} →
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {top.map((standing, index) => (
          <div
            key={standing.player.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "var(--card)",
              color: index === 0 ? "var(--color-coral)" : "var(--muted-foreground)",
            }}
          >
            <span>{standing.player.emoji}</span>
            <span>{standing.player.name}</span>
            <span className="font-black tabular-nums">{standing.points}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
