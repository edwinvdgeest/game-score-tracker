"use client";

import type { Player } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface StarterPickerProps {
  players: Player[];
  onSelect: (player: Player) => void;
  onSkip: () => void;
}

export function StarterPicker({ players, onSelect, onSkip }: StarterPickerProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">Wie begon? 🎲</h2>
      <p
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--muted-foreground)" }}
      >
        Optioneel — wie mocht als eerste?
      </p>

      <div className="flex flex-col gap-3">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-left cursor-pointer transition-all",
              "border-[var(--border)] bg-white hover:border-[var(--color-coral)] hover:bg-[color-mix(in_srgb,var(--color-coral)_5%,transparent)]"
            )}
          >
            <span className="text-2xl">{player.emoji}</span>
            <span className="text-base">{player.name}</span>
          </button>
        ))}

        <button
          onClick={onSkip}
          className="py-3 rounded-2xl border-2 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Overslaan →
        </button>
      </div>
    </div>
  );
}
