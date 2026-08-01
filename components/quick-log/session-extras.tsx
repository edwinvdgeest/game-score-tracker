"use client";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/** Moet matchen met createSessionSchema.notes (.max(500)), anders krijg je een 400. */
const NOTE_MAX_LENGTH = 500;

interface SessionExtrasProps {
  duration: number | null;
  onDurationChange: (mins: number | null) => void;
  note: string;
  onNoteChange: (value: string) => void;
}

/**
 * Speelduur en notitie: de twee optionele velden die bij het potje horen en niet bij een
 * losse score of ronde.
 *
 * Gedeeld door score-entry (één eindscore) en round-entry (rondes), zodat die twee niet
 * elk hun eigen duur-presets krijgen.
 */
export function SessionExtras({
  duration,
  onDurationChange,
  note,
  onNoteChange,
}: SessionExtrasProps) {
  return (
    <>
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

      {/* Notitie (optioneel).
          De swipe-handler voor de wizard-stappen zit op een bovenliggende div. Tekst
          selecteren in een textarea is een horizontale sleep, en die zou je naar de
          vorige stap gooien — daarom stopt deze wrapper de touch-events. */}
      <div
        className="mt-5 space-y-2"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <label
          htmlFor="session-note"
          className="block text-xs font-bold uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          📝 Notitie <span className="normal-case font-semibold">(optioneel)</span>
        </label>
        <textarea
          id="session-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          placeholder="Bijzonderheden, gedenkwaardige zetten, wie er mopperde…"
          className="w-full px-3 py-2 rounded-2xl border-2 font-semibold text-base outline-none transition-colors resize-y"
          style={{
            borderColor: note.trim() ? "var(--color-coral)" : "var(--border)",
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
          }}
        />
        {note.length > NOTE_MAX_LENGTH - 50 && (
          <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            {NOTE_MAX_LENGTH - note.length} tekens over
          </p>
        )}
      </div>
    </>
  );
}
