"use client";

import type { Player } from "@/lib/schemas";

interface ScoreEntryProps {
  players: Player[];
  scores: Record<string, string>;
  onChange: (playerId: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function ScoreEntry({
  players,
  scores,
  onChange,
  onSave,
  saving,
}: ScoreEntryProps) {
  const allFilled = players.every(
    (p) => scores[p.id] !== undefined && scores[p.id]!.trim() !== ""
  );

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">Scores invullen 🎯</h2>
      <p
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--muted-foreground)" }}
      >
        Vul de scores in — de winnaar wordt automatisch bepaald.
      </p>

      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors"
            style={{
              borderColor: scores[player.id]?.trim()
                ? "var(--color-coral)"
                : "var(--border)",
              backgroundColor: "white",
            }}
          >
            <span className="text-2xl">{player.emoji}</span>
            <span className="flex-1 font-bold text-sm">{player.name}</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={scores[player.id] ?? ""}
              onChange={(e) => onChange(player.id, e.target.value)}
              className="w-20 text-center py-1.5 px-2 rounded-xl border-2 font-bold text-sm outline-none transition-colors"
              style={{
                borderColor: scores[player.id]?.trim()
                  ? "var(--color-coral)"
                  : "var(--border)",
                backgroundColor: "white",
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <button
          onClick={onSave}
          disabled={saving || !allFilled}
          className="w-full py-3 rounded-2xl font-bold text-sm cursor-pointer transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)", color: "white" }}
        >
          {saving ? "Opslaan..." : "Opslaan 🎉"}
        </button>
      </div>
    </div>
  );
}
