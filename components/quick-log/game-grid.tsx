"use client";

import type { Game } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface GameGridProps {
  games: Game[];
  selectedGameId: string | null;
  onSelect: (game: Game) => void;
}

export function GameGrid({ games, selectedGameId, onSelect }: GameGridProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">Welk spel?</h2>
      <div className="grid grid-cols-3 gap-2">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
              "min-h-[80px] text-center cursor-pointer",
              selectedGameId === game.id
                ? "border-[var(--color-coral)] bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)]"
                : "border-[var(--border)] bg-white hover:border-[color-mix(in_srgb,var(--color-coral)_50%,transparent)]"
            )}
          >
            <span className="text-2xl mb-1">{game.emoji}</span>
            <span className="text-xs font-bold leading-tight line-clamp-2">
              {game.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
