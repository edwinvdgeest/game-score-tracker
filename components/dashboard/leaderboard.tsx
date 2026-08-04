import type { PlayerStats } from "@/lib/schemas";

interface LeaderboardProps {
  leaderboard: PlayerStats[];
  /** Gasten die in deze periode meespeelden. Leeg of afwezig = geen gastensectie. */
  guestLeaderboard?: PlayerStats[];
}

const rankEmoji = ["👑", "🥈", "🥉"] as const;

/** Eén regel in het scorebord. */
function PlayerRow({
  stats,
  rank,
  highlight = false,
}: {
  stats: PlayerStats;
  rank: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border"
      style={{
        borderColor: highlight ? "var(--color-warm-yellow)" : "var(--border)",
      }}
    >
      <span className="text-2xl w-8 text-center">{rank}</span>
      <span className="text-2xl">{stats.player.emoji}</span>
      <div className="flex-1">
        <div className="font-extrabold">{stats.player.name}</div>
        <div
          className="text-xs font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {stats.total_games === 1
            ? "1 spel gespeeld"
            : `${stats.total_games} spellen gespeeld`}
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
          {/* Zonder gespeelde potjes is een percentage misleidend in plaats van 0%. */}
          {stats.total_games > 0 ? `${stats.win_percentage}%` : "—"}
        </div>
      </div>
    </div>
  );
}

export function Leaderboard({ leaderboard, guestLeaderboard }: LeaderboardProps) {
  const guests = guestLeaderboard ?? [];

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
          style={{ backgroundColor: "var(--color-warm-yellow)", color: "var(--on-warm-yellow)" }}
        >
          <div className="text-5xl mb-2">{leader.player.emoji}</div>
          <div className="text-xl font-black">{leader.player.name} leidt!</div>
          <div className="text-sm font-semibold" style={{ color: "var(--on-warm-yellow-muted)" }}>
            {leader.wins} wins · {leader.win_percentage}%
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((stats, index) => (
          <PlayerRow
            key={stats.player.id}
            stats={stats}
            rank={rankEmoji[index] ?? String(index + 1)}
            highlight={index === 0}
          />
        ))}
      </div>

      {/* Gasten staan apart — ze tellen niet mee in het hoofd-leaderboard */}
      {guests.length > 0 && (
        <div className="space-y-2">
          <h3
            className="text-sm font-extrabold pt-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            🎭 Gasten
          </h3>
          {guests.map((stats, index) => (
            <PlayerRow
              key={stats.player.id}
              stats={stats}
              rank={String(index + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
