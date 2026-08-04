"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_CATEGORIES,
  type Achievement,
  type AchievementTier,
  type PlayerAchievements,
} from "@/lib/achievements";
import { formatDate } from "@/lib/utils";

interface AchievementsClientProps {
  playerAchievements: PlayerAchievements[];
}

type Filter = "all" | "earned" | "locked";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "earned", label: "Behaald" },
  { id: "locked", label: "Nog te doen" },
];

const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "var(--tier-bronze-text)",
  silver: "#a29bfe",
  gold: "var(--tier-gold-text)",
};

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Brons",
  silver: "Zilver",
  gold: "Goud",
};

export function AchievementsClient({ playerAchievements }: AchievementsClientProps) {
  const [activePlayer, setActivePlayer] = useState(
    playerAchievements[0]?.player.id ?? ""
  );
  const [filter, setFilter] = useState<Filter>("all");

  const current = playerAchievements.find((pa) => pa.player.id === activePlayer);
  const total = current?.achievements.length ?? 0;

  // Badges per categorie, in de vaste weergave-volgorde
  const groups = useMemo(() => {
    if (!current) return [];
    return ACHIEVEMENT_CATEGORIES.map((cat) => {
      const all = current.achievements.filter((a) => a.category === cat.id);
      const earned = all.filter((a) => a.earnedAt !== null);
      const visible =
        filter === "earned" ? earned : filter === "locked" ? all.filter((a) => a.earnedAt === null) : all;
      // Behaalde badges bovenaan, nieuwste eerst
      const sorted = [...visible].sort((a, b) => {
        if (a.earnedAt && b.earnedAt) return b.earnedAt.localeCompare(a.earnedAt);
        if (a.earnedAt) return -1;
        if (b.earnedAt) return 1;
        return 0;
      });
      return { ...cat, badges: sorted, earnedCount: earned.length, total: all.length };
    }).filter((g) => g.badges.length > 0);
  }, [current, filter]);

  if (!current) return null;

  const percentage = total > 0 ? Math.round((current.earnedCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Player switcher */}
      <div className="flex gap-2 flex-wrap">
        {playerAchievements.map((pa) => {
          const active = activePlayer === pa.player.id;
          return (
            <button
              key={pa.player.id}
              onClick={() => setActivePlayer(pa.player.id)}
              className="flex-1 min-w-20 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer"
              style={{
                backgroundColor: active ? "var(--color-coral)" : "var(--card)",
                color: active ? "white" : "var(--foreground)",
                borderColor: active ? "var(--color-coral)" : "var(--border)",
              }}
            >
              <span className="text-2xl">{pa.player.emoji}</span>
              <span>{pa.player.name}</span>
              <span className="text-xs opacity-80">
                {pa.earnedCount}/{pa.achievements.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Samenvatting */}
      <div
        className="flex items-center gap-3 p-4 rounded-2xl"
        style={{ backgroundColor: "var(--color-warm-gray)" }}
      >
        <span className="text-4xl">{current.player.emoji}</span>
        <div className="flex-1">
          <div className="font-extrabold">{current.player.name}</div>
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            {current.earnedCount} van {total} badges behaald · {percentage}%
          </div>
          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full mt-1.5 overflow-hidden"
            style={{ backgroundColor: "var(--border)" }}
          >
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${percentage}%`,
                backgroundColor: "var(--color-coral)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer"
              style={{
                borderColor: active ? "var(--color-coral)" : "var(--border)",
                backgroundColor: active
                  ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
                  : "var(--card)",
                color: active ? "var(--color-coral)" : "var(--muted-foreground)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Badges per categorie */}
      {groups.length === 0 && (
        <p
          className="text-sm font-semibold text-center py-8"
          style={{ color: "var(--muted-foreground)" }}
        >
          {filter === "earned"
            ? "Nog geen badges behaald — tijd om te spelen! 🎲"
            : "Alle badges binnen. Respect! 🏆"}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id}>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-extrabold text-base">
              {group.emoji} {group.label}
            </h2>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--muted-foreground)" }}
            >
              {group.earnedCount}/{group.total}
            </span>
          </div>
          <div className="space-y-2">
            {group.badges.map((badge) => (
              <BadgeRow key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeRow({ badge }: { badge: Achievement }) {
  const earned = badge.earnedAt !== null;
  const tierColor = TIER_COLORS[badge.tier];

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border-2"
      style={{
        backgroundColor: earned
          ? `color-mix(in srgb, ${tierColor} 8%, var(--card))`
          : "var(--color-warm-gray)",
        borderColor: earned
          ? `color-mix(in srgb, ${tierColor} 45%, transparent)`
          : "var(--border)",
        opacity: earned ? 1 : 0.65,
      }}
    >
      <span className={earned ? "text-3xl" : "text-3xl grayscale"}>{badge.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="font-extrabold text-sm truncate"
            style={{ color: earned ? "var(--foreground)" : "var(--muted-foreground)" }}
          >
            {badge.name}
          </span>
          <span
            className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              color: earned ? tierColor : "var(--muted-foreground)",
              backgroundColor: earned
                ? `color-mix(in srgb, ${tierColor} 18%, transparent)`
                : "transparent",
              border: earned ? "none" : "1px solid var(--border)",
            }}
          >
            {TIER_LABELS[badge.tier]}
          </span>
        </div>
        <div
          className="text-xs font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {badge.description}
        </div>
      </div>
      {earned && badge.earnedAt && (
        <div
          className="text-xs font-bold text-right shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatDate(badge.earnedAt)}
        </div>
      )}
    </div>
  );
}
