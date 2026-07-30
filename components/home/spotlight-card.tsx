"use client";

import Link from "next/link";
import type { SpotlightCard as SpotlightCardData } from "@/lib/spotlight";
import { CARD_TONE_STYLES } from "@/components/ui/tone-styles";

interface SpotlightCardProps {
  card: SpotlightCardData;
  /** Aangetikte "Nog eens?" — de homepage zet het spel dan in het formulier. */
  onReplay: (gameId: string) => void;
}

export function SpotlightCard({ card, onReplay }: SpotlightCardProps) {
  const tone = CARD_TONE_STYLES[card.tone];

  return (
    <div
      className="rounded-3xl p-4 space-y-3 border-2"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xl">{card.emoji}</span>
        <h2 className="font-extrabold text-base">{card.title}</h2>
      </div>

      <div className="space-y-3">
        {card.entries.map((entry, index) => {
          const replay = entry.replayGame;
          return (
          <div key={`${entry.title}-${index}`} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{entry.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm truncate">{entry.title}</div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {entry.subtitle}
                </div>
              </div>
              {replay && (
                <button
                  onClick={() => onReplay(replay.id)}
                  className="flex-shrink-0 min-h-11 text-xs font-bold px-3 rounded-xl border-2 cursor-pointer transition-colors hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                  aria-label={`${replay.name} nu spelen`}
                >
                  🎮 Nog eens?
                </button>
              )}
            </div>

            {entry.scores.length > 0 && (
              <div
                className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold pl-9"
                style={{ color: "var(--muted-foreground)" }}
              >
                {entry.scores.map((score, scoreIndex) => (
                  <span
                    key={`${score.emoji}-${scoreIndex}`}
                    className={score.isWinner ? "font-black" : undefined}
                    style={score.isWinner ? { color: tone.color } : undefined}
                  >
                    {score.emoji} {score.score}
                  </span>
                ))}
              </div>
            )}

            {entry.note && (
              <p
                className="text-xs font-semibold italic pl-9"
                style={{ color: "var(--muted-foreground)" }}
              >
                📝 {entry.note}
              </p>
            )}
          </div>
          );
        })}
      </div>

      {card.footnote && (
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          {card.footnote}
        </p>
      )}

      {card.cta && (
        <Link
          href={card.cta.href}
          className="flex items-center justify-center w-full min-h-11 rounded-2xl border-2 font-extrabold text-sm transition-colors"
          style={{ borderColor: tone.border, color: tone.color }}
        >
          {card.cta.label}
        </Link>
      )}
    </div>
  );
}
