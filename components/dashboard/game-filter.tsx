"use client";

import type { Game } from "@/lib/schemas";

interface GameFilterProps {
  games: Game[];
  value: string;
  onChange: (gameId: string) => void;
}

export function GameFilter({ games, value, onChange }: GameFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
        🎯 Spel:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold bg-[var(--card)]"
        style={{ color: "var(--foreground)" }}
      >
        <option value="">Alle spellen</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.emoji} {game.name}
          </option>
        ))}
      </select>
    </div>
  );
}
