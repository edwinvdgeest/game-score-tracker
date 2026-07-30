"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  filterCardsForPlayerCount,
  pickSpotlightCards,
  type SpotlightCard as SpotlightCardData,
  type SpotlightKind,
} from "@/lib/spotlight";
import { useSpotlightPrefs } from "@/lib/hooks/useSpotlightPrefs";
import { SpotlightCard } from "./spotlight-card";

/** Vanaf deze afstand is het een swipe en geen tik. Zelfde grens als in het logformulier. */
const MIN_SWIPE = 60;

/** Hoe een kaartsoort in een melding heet. */
const KIND_LABELS: Record<SpotlightKind, string> = {
  memory: "Terugblikken",
  recent: "Laatste potjes",
  revanche: "Revanche",
  streak: "Wie is er warm",
  records: "Recordboek",
  rhythm: "Speelritme",
  dust: "Staat al even stil",
  wrapped: "Jaar in cijfers",
};

interface SpotlightCarouselProps {
  /** De hele pool; welke kaarten je ziet hangt af van de voorkeuren en de bezetting. */
  cards: SpotlightCardData[];
  seed: number;
  onReplay: (gameId: string) => void;
  /** Aantal spelers dat nu aangevinkt staat; 0 = niet filteren. */
  playerCount?: number;
}

export function SpotlightCarousel({
  cards,
  seed,
  onReplay,
  playerCount = 0,
}: SpotlightCarouselProps) {
  const { demoted, demote, restore, restoreAll } = useSpotlightPrefs();
  // null = nog niets aangetikt, dus mag de carrousel zelf een startkaart kiezen.
  const [index, setIndex] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const visible = useMemo(() => {
    const forBezetting = filterCardsForPlayerCount(cards, playerCount);
    return pickSpotlightCards(forBezetting, seed, demoted);
  }, [cards, playerCount, seed, demoted]);

  const total = visible.length;
  // Is er een terugblik van precies vandaag, dan begint de carrousel daar — dat is waar de
  // stip in de navigatiebalk je voor liet komen.
  const exactDayIndex = visible.findIndex((entry) => entry.exactDay);
  const preferredIndex = exactDayIndex >= 0 ? exactDayIndex : 0;
  // De selectie kan krimpen (wegtikken, andere bezetting); dan schuift de index mee.
  const safeIndex = total === 0 ? 0 : Math.min(index ?? preferredIndex, total - 1);

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

  const next = useCallback(() => goTo(safeIndex + 1, "left"), [goTo, safeIndex]);
  const previous = useCallback(() => goTo(safeIndex - 1, "right"), [goTo, safeIndex]);

  /** Willekeurige andere kaart — "verras me". */
  const surprise = useCallback(() => {
    if (total <= 1) return;
    const offset = 1 + Math.floor(Math.random() * (total - 1));
    goTo(safeIndex + offset, "left");
  }, [goTo, safeIndex, total]);

  const card = visible[safeIndex];

  /** Deze kaartsoort een maand achteraan zetten, met een uitweg in de melding. */
  const handleDemote = useCallback(() => {
    if (!card) return;
    const kind = card.kind;
    demote(kind);
    setIndex(0);
    toast.success(`🙈 ${KIND_LABELS[kind]} zie je een tijdje minder`, {
      action: { label: "Ongedaan maken", onClick: () => restore(kind) },
    });
  }, [card, demote, restore]);

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

      <div className="flex items-center gap-1">
        {total > 1 && (
          <button
            onClick={previous}
            className="min-w-11 min-h-11 rounded-xl font-black cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Vorige kaart"
          >
            ‹
          </button>
        )}

        {/* Stippen — zelfde idee als de voortgangsbalkjes in het logformulier. */}
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {total > 1 &&
            visible.map((dot, dotIndex) => (
              <button
                key={dot.id}
                onClick={() => goTo(dotIndex, dotIndex > safeIndex ? "left" : "right")}
                className="h-6 w-4 flex items-center justify-center cursor-pointer"
                aria-label={`Kaart ${dotIndex + 1}: ${dot.title}`}
                aria-current={dotIndex === safeIndex}
              >
                <span
                  className="block h-1.5 w-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      dotIndex === safeIndex ? "var(--color-coral)" : "var(--border)",
                    transform: dotIndex === safeIndex ? "scale(1.4)" : "scale(1)",
                  }}
                />
              </button>
            ))}
        </div>

        <button
          onClick={handleDemote}
          className="min-h-11 px-2 rounded-xl text-xs font-bold cursor-pointer transition-colors hover:text-[var(--color-coral)]"
          style={{ color: "var(--muted-foreground)" }}
          aria-label={`Minder kaarten als "${card.title}"`}
        >
          🙈 Minder
        </button>

        {total > 1 && (
          <>
            <button
              onClick={surprise}
              className="min-h-11 px-2 rounded-xl text-xs font-bold cursor-pointer transition-colors hover:text-[var(--color-coral)]"
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
          </>
        )}
      </div>

      {demoted.length > 0 && (
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          {demoted.length === 1 ? "1 kaartsoort" : `${demoted.length} kaartsoorten`} minder ·{" "}
          <button
            onClick={restoreAll}
            className="underline font-bold cursor-pointer"
            style={{ color: "var(--color-coral)" }}
          >
            alles terug
          </button>
        </p>
      )}
    </div>
  );
}
