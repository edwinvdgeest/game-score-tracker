"use client";

import type { Player } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface WinnerPickerProps {
  players: Player[];
  selectedWinnerId: string | null;
  onSelect: (player: Player) => void;
}

export function WinnerPicker({
  players,
  selectedWinnerId,
  onSelect,
}: WinnerPickerProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">Wie won? 🏆</h2>
      <div className="grid grid-cols-3 gap-3">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer",
              "min-h-[100px]",
              selectedWinnerId === player.id
                ? "border-[var(--color-coral)] bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)] scale-95"
                : "border-[var(--border)] bg-white hover:border-[color-mix(in_srgb,var(--color-coral)_50%,transparent)]"
            )}
          >
            <span className="text-4xl mb-2">{player.emoji}</span>
            <span className="text-sm font-extrabold">{player.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
