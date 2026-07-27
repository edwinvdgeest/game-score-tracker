"use client";

import type { Player } from "@/lib/schemas";

export type Pair = { a: Player; b: Player };

/** Alle unieke paren, in een stabiele volgorde. */
export function buildPairs(players: Player[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (a && b) pairs.push({ a, b });
    }
  }
  return pairs;
}

interface PairSelectorProps {
  pairs: Pair[];
  selected: Pair;
  onSelect: (pair: Pair) => void;
}

export function PairSelector({ pairs, selected, onSelect }: PairSelectorProps) {
  // Bij precies twee spelers is er niets te kiezen.
  if (pairs.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
      {pairs.map((pair) => {
        const isActive = pair.a.id === selected.a.id && pair.b.id === selected.b.id;
        return (
          <button
            key={`${pair.a.id}|${pair.b.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(pair)}
            className="flex-shrink-0 px-3 py-2 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
            style={{
              borderColor: isActive ? "var(--color-coral)" : "var(--border)",
              backgroundColor: isActive
                ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
                : "var(--card)",
              color: isActive ? "var(--color-coral)" : "var(--muted-foreground)",
            }}
          >
            {pair.a.emoji} {pair.a.name} ⚔️ {pair.b.emoji} {pair.b.name}
          </button>
        );
      })}
    </div>
  );
}
