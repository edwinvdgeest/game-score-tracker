import Link from "next/link";
import type { WrappedResponse } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { WrappedStat } from "./wrapped-stat";
import { ShareButton } from "./share-button";

interface WrappedCardProps {
  wrapped: WrappedResponse;
}

/** "3u 20m" of "45m" — leesbaarder dan een getal in minuten. */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}u` : `${hours}u ${rest}m`;
}

/** Tekstsamenvatting voor de Web Share API. */
function buildSummary(wrapped: WrappedResponse): string {
  const parts: string[] = [`🎲 Spelscores ${wrapped.year}`];

  const podium = wrapped.leaderboard.filter((entry) => entry.total_games > 0);
  if (podium.length > 0) {
    parts.push(
      podium
        .slice(0, 3)
        .map((entry) => `${entry.player.name} ${entry.wins}`)
        .join(" – ")
    );
  }
  parts.push(`${wrapped.sessionCount} potjes`);
  const topGame = wrapped.topGames[0];
  if (topGame) parts.push(`meest gespeeld: ${topGame.game.name}`);

  return parts.join(" · ");
}

export function WrappedCard({ wrapped }: WrappedCardProps) {
  const played = wrapped.leaderboard.filter((entry) => entry.total_games > 0);
  const champion = played[0];
  const topGame = wrapped.topGames[0];

  if (wrapped.sessionCount === 0) {
    return (
      <div
        className="text-center py-12 rounded-3xl font-semibold"
        style={{
          backgroundColor: "var(--color-warm-gray)",
          color: "var(--muted-foreground)",
        }}
      >
        In {wrapped.year} is er niet gespeeld 🎲
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Eén omkaderde kaart, portrait, zodat een screenshot alles meeneemt. */}
      <div
        className="rounded-3xl border-2 p-5 space-y-4 max-w-sm mx-auto"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--color-coral)",
        }}
      >
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            Spelscores
          </div>
          <div className="text-5xl font-black" style={{ color: "var(--color-coral)" }}>
            {wrapped.year}
          </div>
        </div>

        {champion && (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "var(--color-warm-yellow)" }}
          >
            <div className="text-5xl mb-1">{champion.player.emoji}</div>
            <div className="font-black text-lg">{champion.player.name}</div>
            <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
              speler van het jaar · {champion.wins} winsten ·{" "}
              {champion.win_percentage}%
            </div>
          </div>
        )}

        {/* Volledige stand */}
        <div className="space-y-1.5">
          {played.map((entry, index) => (
            <div
              key={entry.player.id}
              className="flex items-center gap-2 text-sm font-bold"
            >
              <span className="w-5 text-center">{index + 1}</span>
              <span className="text-lg">{entry.player.emoji}</span>
              <span className="flex-1 truncate">{entry.player.name}</span>
              <span className="tabular-nums">{entry.wins}</span>
              <span
                className="text-xs font-semibold w-10 text-right"
                style={{ color: "var(--muted-foreground)" }}
              >
                {entry.win_percentage}%
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <WrappedStat
            icon="🎮"
            label="Potjes"
            value={String(wrapped.sessionCount)}
          />
          {wrapped.totalMinutes > 0 && (
            <WrappedStat
              icon="⏱️"
              label="Speeltijd"
              value={formatDuration(wrapped.totalMinutes)}
            />
          )}
          {topGame && (
            <WrappedStat
              icon={topGame.game.emoji}
              label="Meest gespeeld"
              value={topGame.game.name}
              detail={`${topGame.play_count}x`}
            />
          )}
          {wrapped.favouriteDay && (
            <WrappedStat
              icon="📅"
              label="Favoriete dag"
              value={wrapped.favouriteDay.label}
              detail={`${wrapped.favouriteDay.sessions} potjes`}
            />
          )}
          {wrapped.bestScore && (
            <WrappedStat
              icon="🎯"
              label="Hoogste score"
              value={String(wrapped.bestScore.score)}
              detail={`${wrapped.bestScore.player.emoji} bij ${wrapped.bestScore.game.name}`}
            />
          )}
          {wrapped.longestStreak && (
            <WrappedStat
              icon="🔥"
              label="Langste reeks"
              value={`${wrapped.longestStreak.length}x`}
              detail={`${wrapped.longestStreak.player.emoji} ${wrapped.longestStreak.player.name}`}
            />
          )}
          {wrapped.newGame && (
            <WrappedStat
              icon="✨"
              label="Nieuw dit jaar"
              value={wrapped.newGame.game.name}
              detail={formatDate(wrapped.newGame.firstPlayedAt)}
            />
          )}
        </div>

        {wrapped.seasonChampions.length > 0 && (
          <div className="space-y-1.5">
            <div
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              🏆 Seizoenskampioenen
            </div>
            {wrapped.seasonChampions.map((entry) => (
              <div
                key={`${entry.season.year}-${entry.season.quarter}`}
                className="flex items-center gap-2 text-sm font-bold"
              >
                <span
                  className="text-xs font-semibold w-16"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Q{entry.season.quarter} {entry.season.year}
                </span>
                <span className="text-lg">{entry.champion.emoji}</span>
                <span className="truncate">{entry.champion.name}</span>
              </div>
            ))}
          </div>
        )}

        {wrapped.topGames.length > 1 && (
          <div className="space-y-1.5">
            <div
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              🎲 Top spellen
            </div>
            {wrapped.topGames.map((entry) => (
              <div
                key={entry.game.id}
                className="flex items-center gap-2 text-sm font-bold"
              >
                <span className="text-lg">{entry.game.emoji}</span>
                <Link
                  href={`/games/${entry.game.id}`}
                  className="flex-1 truncate hover:underline"
                >
                  {entry.game.name}
                </Link>
                <span
                  className="tabular-nums text-xs font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {entry.play_count}x
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-sm mx-auto">
        <ShareButton summary={buildSummary(wrapped)} year={wrapped.year} />
      </div>
    </div>
  );
}
