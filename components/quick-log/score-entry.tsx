"use client";

import type { Player } from "@/lib/schemas";
import { SessionExtras } from "./session-extras";

interface ScoreEntryProps {
  players: Player[];
  scores: Record<string, string>;
  onChange: (playerId: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  duration: number | null;
  onDurationChange: (mins: number | null) => void;
  note: string;
  onNoteChange: (value: string) => void;
  lowestScoreWins?: boolean;
  /**
   * Alleen gezet bij een rondespel waarvan de rondes overgeslagen zijn: de weg terug
   * naar het rondescherm.
   */
  onUseRounds?: () => void;
}

export function ScoreEntry({
  players,
  scores,
  onChange,
  onSave,
  saving,
  duration,
  onDurationChange,
  note,
  onNoteChange,
  lowestScoreWins = false,
  onUseRounds,
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
      {lowestScoreWins && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold mb-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-coral) 12%, var(--card))",
            color: "var(--color-coral)",
          }}
        >
          ⛳ Laagste score wint
        </div>
      )}

      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors"
            style={{
              borderColor: scores[player.id]?.trim()
                ? "var(--color-coral)"
                : "var(--border)",
              backgroundColor: "var(--card)",
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
                backgroundColor: "var(--muted)",
                color: "var(--foreground)",
              }}
            />
          </div>
        ))}
      </div>

      <SessionExtras
        duration={duration}
        onDurationChange={onDurationChange}
        note={note}
        onNoteChange={onNoteChange}
      />

      <div className="mt-5">
        <button
          onClick={onSave}
          disabled={saving || !allFilled}
          className="w-full py-3 rounded-2xl font-bold text-sm cursor-pointer transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)", color: "white" }}
        >
          {saving ? "Opslaan..." : "Opslaan 🎉"}
        </button>
        {onUseRounds && (
          <button
            type="button"
            onClick={onUseRounds}
            className="w-full mt-2 py-2 font-bold text-xs cursor-pointer underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            Toch per ronde bijhouden
          </button>
        )}
      </div>
    </div>
  );
}
