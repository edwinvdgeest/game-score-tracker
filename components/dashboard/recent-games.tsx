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
        {sessions.map((session) => {
          const scores = (session.player_scores ?? []).filter((p) => p.score !== null);
          const sortedScores = [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const hasScores = sortedScores.length > 0;

          return (
            <div
              key={session.id}
              className="p-3 bg-[var(--card)] rounded-2xl border space-y-2"
            >
              <div className="flex items-center gap-3">
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
                  {session.winner ? (
                    <>
                      <span className="text-lg">{session.winner.emoji}</span>
                      <span className="text-xs font-black">{session.winner.name}</span>
                    </>
                  ) : (
                    <span
                      className="text-xs font-black"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      🤝 Gelijkspel
                    </span>
                  )}
                </div>
              </div>

              {hasScores && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {sortedScores.map((p, i) => (
                    <div
                      key={p.player_id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold"
                      style={{
                        backgroundColor: "var(--color-warm-gray)",
                        color: i === 0 ? "var(--color-coral)" : "var(--muted-foreground)",
                      }}
                    >
                      <span>{p.player_emoji}</span>
                      <span>{p.player_name}</span>
                      <span className="font-black">{p.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
