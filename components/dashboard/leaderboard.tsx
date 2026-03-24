import type { PlayerStats } from "@/lib/schemas";

interface LeaderboardProps {
  leaderboard: PlayerStats[];
}

const rankEmoji = ["👑", "🥈", "🥉"] as const;

export function Leaderboard({ leaderboard }: LeaderboardProps) {
  if (leaderboard.length === 0 || leaderboard.every((p) => p.wins === 0)) {
    return (
      <div
        className="text-center py-8 font-semibold"
        style={{ color: "var(--muted-foreground)" }}
      >
        Nog geen scores 🎲
      </div>
    );
  }

  const leader = leaderboard[0];

  return (
    <div className="space-y-4">
      {/* Leader banner */}
      {leader && leader.wins > 0 && (
        <div
          className="rounded-3xl p-4 text-center"
          style={{ backgroundColor: "var(--color-warm-yellow)" }}
        >
          <div className="text-5xl mb-2">{leader.player.emoji}</div>
          <div className="text-xl font-black">{leader.player.name} leidt!</div>
          <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
            {leader.wins} wins · {leader.win_percentage}%
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((stats, index) => (
          <div
            key={stats.player.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border"
            style={{
              borderColor:
                index === 0 ? "var(--color-warm-yellow)" : "var(--border)",
            }}
          >
            <span className="text-2xl w-8 text-center">
              {rankEmoji[index] ?? String(index + 1)}
            </span>
            <span className="text-2xl">{stats.player.emoji}</span>
            <div className="flex-1">
              <div className="font-extrabold">{stats.player.name}</div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {stats.total_games} spellen gespeeld
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-black text-lg"
                style={{ color: "var(--color-coral)" }}
              >
                {stats.wins}
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {stats.win_percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
