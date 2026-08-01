"use client";

import {
  ROUND_FORMATS,
  ROUND_FORMAT_HINTS,
  ROUND_FORMAT_LABELS,
  type RoundFormat,
} from "@/lib/rounds";

interface RoundFormatPickerProps {
  /** Prefix voor de veld-id's, zodat add- en edit-formulier niet botsen. */
  idPrefix: string;
  format: RoundFormat;
  onFormatChange: (format: RoundFormat) => void;
  /** Aantal rondes bij 'vast', als ruwe invoertekst. */
  count: string;
  onCountChange: (value: string) => void;
  /** Grens bij 'grens', als ruwe invoertekst. */
  target: string;
  onTargetChange: (value: string) => void;
}

/**
 * Rondevorm van een spel instellen. Gedeeld door add-game-form en edit-game-form.
 *
 * Het extra veld hoort bij de vorm: 'vast' vraagt een aantal, 'grens' een grens, de
 * andere vormen vragen niets. Wat je bij de ene vorm invulde blijft in beeld zolang je
 * heen en weer klikt, maar wordt bij het opslaan genuld door normalizeRoundConfig.
 */
export function RoundFormatPicker({
  idPrefix,
  format,
  onFormatChange,
  count,
  onCountChange,
  target,
  onTargetChange,
}: RoundFormatPickerProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={`${idPrefix}-round-format`} className="text-sm font-bold block">
        Rondes
      </label>
      <select
        id={`${idPrefix}-round-format`}
        value={format}
        onChange={(e) => onFormatChange(e.target.value as RoundFormat)}
        className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
        style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
      >
        {ROUND_FORMATS.map((value) => (
          <option key={value} value={value}>
            {ROUND_FORMAT_LABELS[value]}
          </option>
        ))}
      </select>
      <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
        {ROUND_FORMAT_HINTS[format]}
      </p>

      {format === "vast" && (
        <div className="flex items-center gap-2 pt-1">
          <label
            htmlFor={`${idPrefix}-round-count`}
            className="text-xs font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            Aantal rondes
          </label>
          <input
            id={`${idPrefix}-round-count`}
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={count}
            onChange={(e) => onCountChange(e.target.value)}
            className="w-20 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          />
        </div>
      )}

      {format === "grens" && (
        <div className="flex items-center gap-2 pt-1">
          <label
            htmlFor={`${idPrefix}-round-target`}
            className="text-xs font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            Spelen tot
          </label>
          <input
            id={`${idPrefix}-round-target`}
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(e) => onTargetChange(e.target.value)}
            className="w-20 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          />
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            punten
          </span>
        </div>
      )}
    </div>
  );
}
