"use client";

import type { HypeFact } from "@/lib/schemas";

const TONE_STYLES: Record<
  HypeFact["tone"],
  { color: string; bg: string; border: string }
> = {
  coral: {
    color: "var(--color-coral)",
    bg: "color-mix(in srgb, var(--color-coral) 12%, var(--card))",
    border: "color-mix(in srgb, var(--color-coral) 45%, transparent)",
  },
  mint: {
    color: "var(--color-mint)",
    bg: "color-mix(in srgb, var(--color-mint) 14%, var(--card))",
    border: "color-mix(in srgb, var(--color-mint) 50%, transparent)",
  },
  lavender: {
    color: "var(--color-lavender)",
    bg: "color-mix(in srgb, var(--color-lavender) 14%, var(--card))",
    border: "color-mix(in srgb, var(--color-lavender) 50%, transparent)",
  },
  yellow: {
    color: "#b89000",
    bg: "color-mix(in srgb, var(--color-warm-yellow) 35%, var(--card))",
    border: "color-mix(in srgb, var(--color-warm-yellow) 70%, transparent)",
  },
};

interface WinnerHighlightsProps {
  highlights: HypeFact[];
}

export function WinnerHighlights({ highlights }: WinnerHighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      {highlights.map((h, i) => {
        const tone = TONE_STYLES[h.tone];
        return (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 text-sm font-extrabold"
            style={{
              color: tone.color,
              backgroundColor: tone.bg,
              borderColor: tone.border,
              animation: `highlight-in 0.5s ease-out ${200 + i * 150}ms both`,
            }}
          >
            <span className="text-lg leading-none">{h.icon}</span>
            <span className="text-left">{h.text}</span>
          </div>
        );
      })}
      <style>{`
        @keyframes highlight-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
