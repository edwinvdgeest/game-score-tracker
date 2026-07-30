"use client";

import type { HypeFact } from "@/lib/schemas";
import { PILL_TONE_STYLES as TONE_STYLES } from "@/components/ui/tone-styles";

interface HypeCardProps {
  facts: HypeFact[];
}

export function HypeCard({ facts }: HypeCardProps) {
  if (facts.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      style={{ touchAction: "pan-x", scrollbarWidth: "none" }}
    >
      {facts.map((fact, i) => {
        const tone = TONE_STYLES[fact.tone];
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-xs font-bold flex-shrink-0"
            style={{
              color: tone.color,
              backgroundColor: tone.bg,
              borderColor: tone.border,
              animation: `hype-in 0.4s ease-out ${i * 80}ms both`,
            }}
          >
            <span className="text-sm leading-none">{fact.icon}</span>
            <span>{fact.text}</span>
          </div>
        );
      })}
      <style>{`
        @keyframes hype-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
