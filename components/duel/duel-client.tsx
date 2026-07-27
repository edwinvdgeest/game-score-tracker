"use client";

import { useState } from "react";
import type { HeadToHeadResponse } from "@/lib/queries";
import type { HypeFact, PeriodFilter, Player } from "@/lib/schemas";
import type { HeadToHead } from "@/lib/duel";
import { useHeadToHead } from "@/lib/hooks/useHeadToHead";
import { PeriodFilterTabs } from "@/components/dashboard/period-filter";
import { HypeCard } from "@/components/quick-log/hype-card";
import { formatDate } from "@/lib/utils";
import { buildPairs, PairSelector, type Pair } from "./pair-selector";
import { DuelScoreboard } from "./duel-scoreboard";
import { PerGameRecord } from "./per-game-record";

interface DuelClientProps {
  players: Player[];
  initialDuel: HeadToHeadResponse | null;
}

/** Losse feitjes bovenaan, in dezelfde stijl als de hype-kaart bij het loggen. */
function duelFacts(
  stats: HeadToHead,
  playerA: Player,
  playerB: Player
): HypeFact[] {
  const facts: HypeFact[] = [];

  if (stats.currentStreakA !== 0) {
    const leader = stats.currentStreakA > 0 ? playerA : playerB;
    const length = Math.abs(stats.currentStreakA);
    if (length >= 2) {
      facts.push({
        icon: "🔥",
        text: `${leader.emoji} ${leader.name} won de laatste ${length} onderling`,
        tone: "coral",
      });
    }
  }

  const bestStreak = Math.max(stats.longestStreakA, stats.longestStreakB);
  if (bestStreak >= 3) {
    const holder =
      stats.longestStreakA >= stats.longestStreakB ? playerA : playerB;
    facts.push({
      icon: "📈",
      text: `Langste reeks: ${holder.emoji} ${holder.name} met ${bestStreak}`,
      tone: "lavender",
    });
  }

  if (stats.biggestMargin) {
    const winner = stats.biggestMargin.winner === "a" ? playerA : playerB;
    facts.push({
      icon: "💥",
      text: `Grootste marge: ${stats.biggestMargin.margin} punten door ${winner.emoji} ${winner.name}`,
      tone: "yellow",
    });
  }

  if (stats.draws > 0) {
    facts.push({
      icon: "🤝",
      text:
        stats.draws === 1 ? "1 keer gelijkgespeeld" : `${stats.draws}x gelijkgespeeld`,
      tone: "mint",
    });
  }

  return facts;
}

export function DuelClient({ players, initialDuel }: DuelClientProps) {
  const pairs = buildPairs(players);
  const firstPair = pairs[0];

  const [selected, setSelected] = useState<Pair | null>(firstPair ?? null);
  const [period, setPeriod] = useState<PeriodFilter>("all");

  const { duel, isLoading } = useHeadToHead(
    selected?.a.id ?? null,
    selected?.b.id ?? null,
    period
  );

  if (!selected) {
    return (
      <div
        className="text-center py-12 rounded-3xl font-semibold"
        style={{
          backgroundColor: "var(--color-warm-gray)",
          color: "var(--muted-foreground)",
        }}
      >
        Voeg minstens twee spelers toe om een duel te zien 👥
      </div>
    );
  }

  /** Draai het perspectief om — bepaalt wie links staat en van wie de nemesis is. */
  function flip() {
    setSelected((prev) => (prev ? { a: prev.b, b: prev.a } : prev));
  }

  // Val terug op de server-render zolang SWR nog laadt en het paar hetzelfde is.
  const initialMatchesSelection =
    initialDuel?.playerA.id === selected.a.id &&
    initialDuel?.playerB.id === selected.b.id;
  const display = duel ?? (initialMatchesSelection ? initialDuel : null);

  return (
    <div
      className="space-y-6 transition-opacity"
      style={{ opacity: isLoading && !display ? 0.6 : 1 }}
    >
      <PairSelector pairs={pairs} selected={selected} onSelect={setSelected} />
      <PeriodFilterTabs value={period} onChange={setPeriod} />

      {!display ? (
        <div className="flex items-center justify-center py-16 text-4xl">⚔️</div>
      ) : display.stats.total === 0 ? (
        <div
          className="text-center py-12 rounded-3xl font-semibold"
          style={{
            backgroundColor: "var(--color-warm-gray)",
            color: "var(--muted-foreground)",
          }}
        >
          {display.playerA.name} en {display.playerB.name} hebben in deze periode nog
          geen potje samen gespeeld 🎲
        </div>
      ) : (
        <>
          <DuelScoreboard
            playerA={display.playerA}
            playerB={display.playerB}
            stats={display.stats}
          />

          <HypeCard
            facts={duelFacts(display.stats, display.playerA, display.playerB)}
          />

          {display.stats.nemesisForA && (
            <div
              className="rounded-3xl p-4 space-y-1"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-coral) 10%, var(--card))",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-extrabold text-base">
                  😤 Nemesis van {display.playerA.name}
                </h2>
                <button
                  type="button"
                  onClick={flip}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border-2 cursor-pointer transition-colors hover:border-[var(--color-coral)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  ↔ Omdraaien
                </button>
              </div>
              <p className="font-bold text-sm">
                {display.stats.nemesisForA.game.emoji}{" "}
                {display.stats.nemesisForA.game.name}
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {display.stats.nemesisForA.aWins} van{" "}
                {display.stats.nemesisForA.total} onderling gewonnen
              </p>
            </div>
          )}

          {display.stats.biggestMargin && (
            <div
              className="rounded-3xl p-4 space-y-1 border"
              style={{ backgroundColor: "var(--card)" }}
            >
              <h2 className="font-extrabold text-base">💥 Grootste afstraffing</h2>
              <p className="font-bold text-sm">
                {display.stats.biggestMargin.margin} punten verschil bij{" "}
                {display.stats.biggestMargin.game.emoji}{" "}
                {display.stats.biggestMargin.game.name}
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {formatDate(display.stats.biggestMargin.played_at)} ·{" "}
                {display.stats.biggestMargin.winner === "a"
                  ? `${display.playerA.emoji} ${display.playerA.name}`
                  : `${display.playerB.emoji} ${display.playerB.name}`}
              </p>
            </div>
          )}

          <PerGameRecord
            records={display.stats.perGame}
            playerA={display.playerA}
            playerB={display.playerB}
          />
        </>
      )}
    </div>
  );
}
