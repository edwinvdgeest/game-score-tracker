"use client";

import { useCallback, useRef, useState } from "react";
import type { SpotlightCard as SpotlightCardData } from "@/lib/spotlight";
import { SpotlightCard } from "./spotlight-card";

/** Vanaf deze afstand is het een swipe en geen tik. Zelfde grens als in het logformulier. */
const MIN_SWIPE = 60;

interface SpotlightCarouselProps {
  cards: SpotlightCardData[];
  onReplay: (gameId: string) => void;
}

export function SpotlightCarousel({ cards, onReplay }: SpotlightCarouselProps) {
  const [index, setIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const total = cards.length;

  const goTo = useCallback(
    (next: number, direction: "left" | "right") => {
      if (total === 0) return;
      setSlideDir(direction);
      setIndex(((next % total) + total) % total);
      // Kort tikje zodat het wisselen voelt als bladeren.
      window.setTimeout(() => setSlideDir(null), 200);
    },
    [total]
  );

  const next = useCallback(() => goTo(index + 1, "left"), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1, "right"), [goTo, index]);

  /** Willekeurige andere kaart — "verras me". */
  const surprise = useCallback(() => {
    if (total <= 1) return;
    const offset = 1 + Math.floor(Math.random() * (total - 1));
    goTo(index + offset, "left");
  }, [goTo, index, total]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    // Niet doorlaten naar het formulier eronder, dat dezelfde swipe gebruikt.
    event.stopPropagation();
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.stopPropagation();
      if (touchStartX.current === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < MIN_SWIPE) return;
      if (dx < 0) next();
      else previous();
    },
    [next, previous]
  );

  const card = cards[index];
  if (!card) return null;

  return (
    <div className="space-y-2">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          transform:
            slideDir === "left"
              ? "translateX(-8px)"
              : slideDir === "right"
              ? "translateX(8px)"
              : "translateX(0)",
          opacity: slideDir ? 0.7 : 1,
          transition: "transform 0.2s ease, opacity 0.2s ease",
        }}
      >
        <SpotlightCard card={card} onReplay={onReplay} />
      </div>

      {total > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={previous}
            className="min-w-11 min-h-11 rounded-xl font-black cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Vorige kaart"
          >
            ‹
          </button>

          {/* Stippen — zelfde idee als de voortgangsbalkjes in het logformulier. */}
          <div className="flex flex-1 items-center justify-center gap-1.5">
            {cards.map((dot, dotIndex) => (
              <button
                key={dot.id}
                onClick={() => goTo(dotIndex, dotIndex > index ? "left" : "right")}
                className="h-6 w-4 flex items-center justify-center cursor-pointer"
                aria-label={`Kaart ${dotIndex + 1}: ${dot.title}`}
                aria-current={dotIndex === index}
              >
                <span
                  className="block h-1.5 w-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      dotIndex === index ? "var(--color-coral)" : "var(--border)",
                    transform: dotIndex === index ? "scale(1.4)" : "scale(1)",
                  }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={surprise}
            className="min-h-11 px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors hover:text-[var(--color-coral)]"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Verras me met een andere kaart"
          >
            🎲 Verras me
          </button>

          <button
            onClick={next}
            className="min-w-11 min-h-11 rounded-xl font-black cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Volgende kaart"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
