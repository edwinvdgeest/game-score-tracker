"use client";

import type { Player } from "@/lib/schemas";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

interface ScoreEntryProps {
  players: Player[];
  scores: Record<string, string>;
  onChange: (playerId: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  duration: number | null;
  onDurationChange: (mins: number | null) => void;
}

export function ScoreEntry({
  players,
  scores,
  onChange,
  onSave,
  saving,
  duration,
  onDurationChange,
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

      {/* Speelduur (optioneel) */}
      <div className="mt-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          ⏱️ Hoe lang gespeeld? <span className="normal-case font-semibold">(optioneel)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => onDurationChange(duration === mins ? null : mins)}
              className="px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer"
              style={{
                borderColor: duration === mins ? "var(--color-coral)" : "var(--border)",
                backgroundColor:
                  duration === mins
                    ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
                    : "var(--card)",
                color: duration === mins ? "var(--color-coral)" : "var(--muted-foreground)",
              }}
            >
              {mins}m
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            placeholder="Anders"
            value={duration !== null && !DURATION_PRESETS.includes(duration) ? String(duration) : ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onDurationChange(!isNaN(v) && v > 0 ? v : null);
            }}
            className="w-20 px-2 py-1.5 rounded-xl border-2 font-bold text-xs text-center outline-none"
            style={{
              borderColor:
                duration !== null && !DURATION_PRESETS.includes(duration)
                  ? "var(--color-coral)"
                  : "var(--border)",
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          />
        </div>
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
