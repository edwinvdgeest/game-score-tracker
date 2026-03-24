import type { StatsResponse } from "@/lib/schemas";
import { formatShortDate } from "@/lib/utils";

type RecentSession = StatsResponse["recent_sessions"][number];

interface RecentGamesProps {
  sessions: RecentSession[];
}

export function RecentGames({ sessions }: RecentGamesProps) {
  if (sessions.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-extrabold mb-3">🕐 Recente spellen</h2>
        <div
          className="text-center py-8 font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Nog geen spellen gespeeld
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">🕐 Recente spellen</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-3 p-3 bg-white rounded-2xl border"
          >
            <span className="text-xl">{session.game.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm truncate">
                {session.game.name}
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {formatShortDate(session.played_at)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">{session.winner.emoji}</span>
              <span className="text-xs font-black">{session.winner.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
