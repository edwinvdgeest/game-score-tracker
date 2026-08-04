import type { FactTone } from "@/lib/schemas";

export type ToneStyle = { color: string; bg: string; border: string };

/** Zachte variant voor pillen in een rij (hype-kaart). */
export const PILL_TONE_STYLES: Record<FactTone, ToneStyle> = {
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
    color: "var(--tier-gold-text)",
    bg: "var(--tier-gold-bg)",
    border: "color-mix(in srgb, var(--color-warm-yellow) 60%, transparent)",
  },
};

/** Iets steviger, voor blokken die op zichzelf staan (highlights, spotlight). */
export const CARD_TONE_STYLES: Record<FactTone, ToneStyle> = {
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
    color: "var(--tier-gold-text)",
    bg: "var(--tier-gold-bg)",
    border: "color-mix(in srgb, var(--color-warm-yellow) 70%, transparent)",
  },
};
