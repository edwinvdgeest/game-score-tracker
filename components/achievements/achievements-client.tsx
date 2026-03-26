"use client";

import { useState } from "react";
import type { PlayerAchievements } from "@/lib/achievements";
import { formatDate } from "@/lib/utils";

interface AchievementsClientProps {
  playerAchievements: PlayerAchievements[];
}

export function AchievementsClient({ playerAchievements }: AchievementsClientProps) {
  const [activePlayer, setActivePlayer] = useState(
    playerAchievements[0]?.player.id ?? ""
  );

  const current = playerAchievements.find((pa) => pa.player.id === activePlayer);

  return (
    <div className="space-y-5">
      {/* Player switcher */}
      <div className="flex gap-2">
        {playerAchievements.map((pa) => (
          <button
            key={pa.player.id}
            onClick={() => setActivePlayer(pa.player.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border font-bold text-sm transition-all cursor-pointer"
            style={{
              backgroundColor:
                activePlayer === pa.player.id ? "var(--color-coral)" : "white",
              color: activePlayer === pa.player.id ? "white" : "var(--foreground)",
              borderColor:
                activePlayer === pa.player.id
                  ? "var(--color-coral)"
                  : "var(--border)",
            }}
          >
            <span className="text-2xl">{pa.player.emoji}</span>
            <span>{pa.player.name}</span>
            <span className="text-xs opacity-80">
              {pa.earnedCount}/{pa.achievements.length} badges
            </span>
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      {current && (
        <>
          {/* Summary */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          >
            <span className="text-4xl">{current.player.emoji}</span>
            <div>
              <div className="font-extrabold">{current.player.name}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                {current.earnedCount} van {current.achievements.length} badges behaald
              </div>
              {/* Progress bar */}
              <div
                className="w-32 h-2 rounded-full mt-1"
                style={{ backgroundColor: "#e8e0d4" }}
              >
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(current.earnedCount / current.achievements.length) * 100}%`,
                    backgroundColor: "var(--color-coral)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Earned badges */}
          {current.achievements.filter((a) => a.earnedAt !== null).length > 0 && (
            <div>
              <h2 className="font-extrabold text-base mb-3">✅ Behaald</h2>
              <div className="space-y-2">
                {current.achievements
                  .filter((a) => a.earnedAt !== null)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3 bg-[var(--card)] rounded-2xl border"
                    >
                      <span className="text-3xl">{achievement.emoji}</span>
                      <div className="flex-1">
                        <div className="font-extrabold text-sm">{achievement.name}</div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {achievement.description}
                        </div>
                      </div>
                      <div
                        className="text-xs font-bold text-right"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {achievement.earnedAt ? formatDate(achievement.earnedAt) : ""}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Locked badges */}
          {current.achievements.filter((a) => a.earnedAt === null).length > 0 && (
            <div>
              <h2 className="font-extrabold text-base mb-3">🔒 Nog te behalen</h2>
              <div className="space-y-2">
                {current.achievements
                  .filter((a) => a.earnedAt === null)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border"
                      style={{
                        backgroundColor: "var(--color-warm-gray)",
                        opacity: 0.7,
                      }}
                    >
                      <span className="text-3xl grayscale">{achievement.emoji}</span>
                      <div className="flex-1">
                        <div
                          className="font-extrabold text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {achievement.name}
                        </div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {achievement.description}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
