"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Game } from "@/lib/schemas";
import { GameCover } from "@/components/games/game-cover";
import { cn } from "@/lib/utils";

interface GameGridProps {
  games: Game[];
  selectedGameId: string | null;
  onSelect: (game: Game) => void;
  /** Aantal spelers dat aangevinkt staat. 0 = geen bezettingsfilter. */
  playerCount?: number;
}

/** Past dit spel bij dit aantal spelers? Onbekende grenzen verbergen nooit iets. */
function fitsPlayers(game: Game, count: number): boolean {
  const { min_players: min, max_players: max } = game;
  if (typeof min !== "number" || typeof max !== "number") return true;
  if (min <= 0 || max <= 0 || max < min) return true;
  return min <= count && count <= max;
}

export function GameGrid({
  games,
  selectedGameId,
  onSelect,
  playerCount = 0,
}: GameGridProps) {
  const [query, setQuery] = useState("");
  const [fitOnly, setFitOnly] = useState(true);

  // Zoeken gaat vóór het bezettingsfilter: typ je een naam, dan zoek je in alles.
  const searched = query.trim()
    ? games.filter((g) =>
        g.name.toLowerCase().includes(query.toLowerCase().trim())
      )
    : games;

  const fitting = playerCount > 0 ? searched.filter((g) => fitsPlayers(g, playerCount)) : searched;
  const hiddenCount = searched.length - fitting.length;
  // Het filter mag nooit alles wegvegen — dan liever het volle raster.
  const filterActive = fitOnly && !query.trim() && hiddenCount > 0 && fitting.length > 0;
  const filtered = filterActive ? fitting : searched;

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">Welk spel?</h2>

      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          type="text"
          placeholder="Zoek spel..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-xl border-2 text-sm font-semibold outline-none transition-colors"
          style={{
            borderColor: query ? "var(--color-coral)" : "var(--border)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            aria-label="Zoekveld leegmaken"
          >
            <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          </button>
        )}
      </div>

      {/* Bezettingsfilter. Alleen te zien als het iets doet, en altijd met één tik uit te
          zetten — een spel dat je zoekt mag nooit onvindbaar zijn. */}
      {playerCount > 0 && !query.trim() && hiddenCount > 0 && fitting.length > 0 && (
        <button
          onClick={() => setFitOnly((value) => !value)}
          className="mb-3 inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full border-2 text-xs font-bold cursor-pointer transition-colors"
          style={
            filterActive
              ? {
                  borderColor: "var(--color-coral)",
                  color: "var(--color-coral)",
                  backgroundColor:
                    "color-mix(in srgb, var(--color-coral) 10%, transparent)",
                }
              : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
          }
          aria-pressed={filterActive}
        >
          🙋 Past bij {playerCount} {playerCount === 1 ? "speler" : "spelers"}
          <span style={{ color: "var(--muted-foreground)" }}>
            · {filterActive ? `${hiddenCount} verborgen` : "alles zichtbaar"}
          </span>
        </button>
      )}

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {filtered.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
              "min-h-[80px] text-center cursor-pointer",
              selectedGameId === game.id
                ? "border-[var(--color-coral)] bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)]"
                : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--color-coral)_50%,transparent)]"
            )}
          >
            <GameCover game={game} size="md" className="mb-1" />
            <span className="text-xs font-bold leading-tight line-clamp-2">
              {game.name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p
            className="col-span-3 md:col-span-5 text-center py-8 text-sm font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            Geen spellen gevonden 🤷
          </p>
        )}
      </div>
    </div>
  );
}
