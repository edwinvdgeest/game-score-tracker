"use client";

import type { PeriodFilter } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface PeriodFilterTabsProps {
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
}

const options: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Alles" },
  { value: "this_year", label: "Dit jaar" },
  { value: "last_year", label: "Vorig jaar" },
];

export function PeriodFilterTabs({ value, onChange }: PeriodFilterTabsProps) {
  return (
    <div
      className="flex gap-1 rounded-2xl p-1"
      style={{ backgroundColor: "var(--color-warm-gray)" }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer",
            value === option.value ? "bg-[var(--card)] shadow-sm" : ""
          )}
          style={{
            color:
              value === option.value
                ? "var(--color-coral)"
                : "var(--muted-foreground)",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
