"use client";

import type { SessionBadge } from "@/lib/schemas";

const TIER_STYLES: Record<
  SessionBadge["tier"],
  { label: string; color: string; bg: string; border: string }
> = {
  bronze: {
    label: "Bronzen badge",
    color: "var(--tier-bronze-text)",
    bg: "var(--tier-bronze-bg)",
    border: "color-mix(in srgb, #cd7f32 55%, transparent)",
  },
  silver: {
    label: "Zilveren badge",
    color: "var(--color-lavender)",
    bg: "color-mix(in srgb, var(--color-lavender) 14%, var(--card))",
    border: "color-mix(in srgb, var(--color-lavender) 55%, transparent)",
  },
  gold: {
    label: "Gouden badge",
    color: "var(--tier-gold-text)",
    bg: "var(--tier-gold-bg)",
    border: "color-mix(in srgb, var(--color-warm-yellow) 75%, transparent)",
  },
};

interface BadgeUnlockProps {
  badges: SessionBadge[];
  /** Vertraging voordat de eerste badge in beeld ploft (ms) */
  delayMs?: number;
}

/** Badges die met deze sessie zijn ontgrendeld — pas ná de highlights in beeld */
export function BadgeUnlock({ badges, delayMs = 800 }: BadgeUnlockProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <p
        className="text-xs font-black uppercase tracking-wide"
        style={{
          color: "var(--color-coral)",
          animation: `badge-pop 0.4s ease-out ${delayMs}ms both`,
        }}
      >
        {badges.length === 1 ? "🎉 Nieuwe badge ontgrendeld!" : `🎉 ${badges.length} nieuwe badges!`}
      </p>
      {badges.map((badge, i) => {
        const tier = TIER_STYLES[badge.tier];
        return (
          <div
            key={badge.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 text-left"
            style={{
              backgroundColor: tier.bg,
              borderColor: tier.border,
              animation: `badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${
                delayMs + 150 + i * 200
              }ms both`,
            }}
          >
            <span
              className="text-3xl leading-none"
              style={{ animation: "badge-shine 2.5s ease-in-out infinite" }}
            >
              {badge.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm" style={{ color: tier.color }}>
                {badge.name}
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {badge.description}
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes badge-pop {
          from { opacity: 0; transform: scale(0.8) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes badge-shine {
          0%, 100% { transform: rotate(0deg) scale(1); }
          45% { transform: rotate(-8deg) scale(1.12); }
          55% { transform: rotate(8deg) scale(1.12); }
        }
      `}</style>
    </div>
  );
}
