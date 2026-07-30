/**
 * Een uitslag delen: één regel tekst die je in een chat kunt plakken.
 *
 * De tekst wordt hier los van de UI opgebouwd zodat er een test op kan; het delen zelf
 * gebeurt in shareResult(), die de share sheet van de telefoon gebruikt en op de desktop
 * terugvalt op het klembord.
 */

import { formatDate } from "@/lib/utils";

export type ShareParticipant = {
  name: string;
  emoji: string;
  score: number | null;
};

export type ShareResultInput = {
  game: { name: string; emoji: string };
  participants: ShareParticipant[];
  /** Null betekent gelijkspel. */
  winner: { name: string; emoji: string } | null;
  playedAt: string;
  lowestScoreWins?: boolean;
};

/**
 * "🎲 Rummikub — 🎯 Edwin 84 · 🌟 Lisanne 71 → 🎯 Edwin wint! (30 juli 2026)"
 *
 * Spelers zonder score blijven staan (met een streepje), want wie meedeed hoort erbij ook
 * als er geen punten geteld zijn.
 */
export function formatShareText(input: ShareResultInput): string {
  const { game, participants, winner, playedAt, lowestScoreWins = false } = input;

  const ranked = [...participants].sort((a, b) => {
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return lowestScoreWins ? a.score - b.score : b.score - a.score;
  });

  const scoreLine = ranked
    .map((entry) => `${entry.emoji} ${entry.name} ${entry.score ?? "–"}`)
    .join(" · ");

  const outcome = winner
    ? `${winner.emoji} ${winner.name} wint!`
    : "🤝 Gelijkspel!";

  const parts = [`${game.emoji} ${game.name}`];
  if (scoreLine) parts.push(scoreLine);
  parts.push(outcome);

  return `${parts.join(" — ")} (${formatDate(playedAt)})`;
}

/**
 * Deelt de tekst via de share sheet, of zet hem op het klembord als die er niet is.
 * Geeft terug wat er gebeurd is, zodat de knop de juiste melding kan tonen.
 */
export async function shareResult(
  text: string
): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator === "undefined") return "failed";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      // Afbreken door de speler is geen fout; alleen bij een echte fout vallen we terug.
      if (error instanceof Error && error.name === "AbortError") return "shared";
    }
  }

  try {
    await navigator.clipboard?.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
