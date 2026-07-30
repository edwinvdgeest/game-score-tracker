"use client";

import useSWR from "swr";
import type { Game } from "@/lib/schemas";
import type { GameRecap } from "@/lib/spotlight";
import { jsonFetcher } from "@/lib/hooks/fetcher";
import { CARD_TONE_STYLES } from "@/components/ui/tone-styles";

interface GameRecapCardProps {
  game: Game;
}

const tone = CARD_TONE_STYLES.mint;

/**
 * Zodra er een spel gekozen is, is een terugblik van twee jaar geleden niet meer wat je wil
 * weten. Dit staat er dan: de laatste uitslagen van dít spel, de stand, het record en hoe
 * lang zo'n potje meestal duurt.
 */
export function GameRecapCard({ game }: GameRecapCardProps) {
  const { data, isLoading } = useSWR<GameRecap>(
    `/api/games/${game.id}/recap`,
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  if (isLoading || !data) return null;

  const { entries, standings, record, avgDurationMinutes, totalSessions } = data;

  if (totalSessions === 0) {
    return (
      <div
        className="rounded-3xl p-4 border-2 space-y-1"
        style={{ backgroundColor: tone.bg, borderColor: tone.border }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-xl">✨</span>
          <h2 className="font-extrabold text-base">Eerste keer!</h2>
        </div>
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          {game.emoji} {game.name} staat nog niet in de boeken. Wie schrijft er geschiedenis?
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-4 space-y-3 border-2"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xl">📋</span>
        <h2 className="font-extrabold text-base">
          Laatste uitslagen · {game.name}
        </h2>
      </div>

      {/* Mini-stand: wie staat voor bij dit spel? */}
      <div className="flex flex-wrap gap-2">
        {standings.map((row) => (
          <span
            key={row.player.id}
            className="text-xs font-bold px-2.5 py-1 rounded-full border"
            style={{ borderColor: tone.border, color: tone.color }}
          >
            {row.player.emoji} {row.player.name} {row.wins}
            <span style={{ color: "var(--muted-foreground)" }}>
              {" "}
              / {row.played}
            </span>
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={`${entry.title}-${index}`}>
            <div
              className="text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              {entry.subtitle}
            </div>
            {entry.scores.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                {entry.scores.map((score, scoreIndex) => (
                  <span
                    key={`${score.emoji}-${scoreIndex}`}
                    className={score.isWinner ? "font-black" : undefined}
                    style={{
                      color: score.isWinner ? tone.color : "var(--muted-foreground)",
                    }}
                  >
                    {score.emoji} {score.score}
                  </span>
                ))}
              </div>
            )}
            {entry.note && (
              <p
                className="text-xs font-semibold italic"
                style={{ color: "var(--muted-foreground)" }}
              >
                📝 {entry.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
        {totalSessions} {totalSessions === 1 ? "potje" : "potjes"} gespeeld
        {record
          ? ` · ${record.lowestWins ? "laagste" : "record"} ${record.score} door ${
              record.player.emoji
            } ${record.player.name}`
          : ""}
        {avgDurationMinutes ? ` · meestal ~${avgDurationMinutes} min` : ""}
      </p>
    </div>
  );
}
