"use client";

import type { Player } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface ScoreEntryProps {
  players: Player[];
  winnerId: string;
  scores: Record<string, string>;
  onChange: (playerId: string, value: string) => void;
  onSkip: () => void;
  onSave: () => void;
  saving: boolean;
}

export function ScoreEntry({
  players,
  winnerId,
  scores,
  onChange,
  onSkip,
  onSave,
  saving,
}: ScoreEntryProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">Scores invullen? 🎯</h2>
      <p
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--muted-foreground)" }}
      >
        Optioneel — laat leeg als je geen scores bijhoudt.
      </p>

      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors",
              player.id === winnerId
                ? "border-[var(--color-coral)] bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)]"
                : "border-[var(--border)] bg-white"
            )}
          >
            <span className="text-2xl">{player.emoji}</span>
            <span className="flex-1 font-bold text-sm">
              {player.name}
              {player.id === winnerId && (
                <span className="ml-1 text-xs">🏆</span>
              )}
            </span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={scores[player.id] ?? ""}
              onChange={(e) => onChange(player.id, e.target.value)}
              className="w-20 text-center py-1.5 px-2 rounded-xl border-2 font-bold text-sm outline-none transition-colors"
              style={{
                borderColor: scores[player.id]
                  ? "var(--color-coral)"
                  : "var(--border)",
                backgroundColor: "white",
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onSkip}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl border-2 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          Overslaan
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl font-bold text-sm cursor-pointer transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)", color: "white" }}
        >
          {saving ? "Opslaan..." : "Opslaan 🎉"}
        </button>
      </div>
    </div>
  );
}
