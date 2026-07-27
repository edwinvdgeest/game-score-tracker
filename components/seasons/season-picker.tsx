"use client";

import type { SeasonRef } from "@/lib/seasons";
import { seasonLabel } from "@/lib/seasons";

interface SeasonPickerProps {
  seasons: SeasonRef[];
  selected: SeasonRef;
  onSelect: (ref: SeasonRef) => void;
}

function refToValue(ref: SeasonRef): string {
  return `${ref.year}-${ref.quarter}`;
}

export function SeasonPicker({ seasons, selected, onSelect }: SeasonPickerProps) {
  if (seasons.length <= 1) return null;

  return (
    <div className="space-y-1">
      <label
        htmlFor="season-picker"
        className="block text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        Seizoen
      </label>
      <select
        id="season-picker"
        value={refToValue(selected)}
        onChange={(e) => {
          const match = seasons.find((ref) => refToValue(ref) === e.target.value);
          if (match) onSelect(match);
        }}
        className="w-full rounded-2xl border px-3 py-2.5 text-base font-bold"
        style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
      >
        {seasons.map((ref) => (
          <option key={refToValue(ref)} value={refToValue(ref)}>
            {seasonLabel(ref)}
          </option>
        ))}
      </select>
    </div>
  );
}
