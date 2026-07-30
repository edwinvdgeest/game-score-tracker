"use client";

import type { HypeFact } from "@/lib/schemas";
import { CARD_TONE_STYLES as TONE_STYLES } from "@/components/ui/tone-styles";

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
