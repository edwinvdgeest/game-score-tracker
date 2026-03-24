import type { PlayerStats } from "@/lib/schemas";

interface StreakCardsProps {
  leaderboard: PlayerStats[];
}

export function StreakCards({ leaderboard }: StreakCardsProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">🔥 Streaks</h2>
      <div className="grid grid-cols-2 gap-3">
        {leaderboard.map((stats) => (
          <div key={stats.player.id} className="bg-white rounded-2xl border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stats.player.emoji}</span>
              <span className="font-extrabold text-sm">{stats.player.name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Nu
                </span>
                <span
                  className="font-black"
                  style={{ color: "var(--color-coral)" }}
                >
                  {stats.current_streak > 0
                    ? `${stats.current_streak}🔥`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Record
                </span>
                <span
                  className="font-black"
                  style={{ color: "var(--color-mint)" }}
                >
                  {stats.longest_streak}🏆
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
