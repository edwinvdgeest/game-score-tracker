"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Game } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface GameGridProps {
  games: Game[];
  selectedGameId: string | null;
  onSelect: (game: Game) => void;
}

export function GameGrid({ games, selectedGameId, onSelect }: GameGridProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? games.filter((g) =>
        g.name.toLowerCase().includes(query.toLowerCase().trim())
      )
    : games;

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
            backgroundColor: "white",
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

      <div className="grid grid-cols-3 gap-2">
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
            <span className="text-2xl mb-1">{game.emoji}</span>
            <span className="text-xs font-bold leading-tight line-clamp-2">
              {game.name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p
            className="col-span-3 text-center py-8 text-sm font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            Geen spellen gevonden 🤷
          </p>
        )}
      </div>
    </div>
  );
}
