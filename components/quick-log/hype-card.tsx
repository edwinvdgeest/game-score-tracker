"use client";

import type { HypeFact } from "@/lib/schemas";

const TONE_STYLES: Record<
  HypeFact["tone"],
  { color: string; bg: string; border: string }
> = {
  coral: {
    color: "var(--color-coral)",
    bg: "color-mix(in srgb, var(--color-coral) 10%, var(--card))",
    border: "color-mix(in srgb, var(--color-coral) 35%, transparent)",
  },
  mint: {
    color: "var(--color-mint)",
    bg: "color-mix(in srgb, var(--color-mint) 12%, var(--card))",
    border: "color-mix(in srgb, var(--color-mint) 40%, transparent)",
  },
  lavender: {
    color: "var(--color-lavender)",
    bg: "color-mix(in srgb, var(--color-lavender) 12%, var(--card))",
    border: "color-mix(in srgb, var(--color-lavender) 40%, transparent)",
  },
  yellow: {
    color: "#b89000",
    bg: "color-mix(in srgb, var(--color-warm-yellow) 30%, var(--card))",
    border: "color-mix(in srgb, var(--color-warm-yellow) 60%, transparent)",
  },
};

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
