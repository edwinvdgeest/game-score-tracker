import type { SpotlightGame, SpotlightPlayer, SpotlightSession } from "@/lib/spotlight";

/** Spelers die in de spotlight-tests meedoen. */
export const EDWIN: SpotlightPlayer = { id: "edwin", name: "Edwin", emoji: "🎯" };
export const LISANNE: SpotlightPlayer = { id: "lisanne", name: "Lisanne", emoji: "🌟" };
export const MINOU: SpotlightPlayer = { id: "minou", name: "Minou", emoji: "🦋" };

export const RUMMIKUB: SpotlightGame = {
  id: "g1",
  name: "Rummikub",
  emoji: "🔢",
  lowest_score_wins: false,
};

export const GOLF: SpotlightGame = {
  id: "g2",
  name: "Golf",
  emoji: "⛳",
  lowest_score_wins: true,
};

/** Middernacht-vrije datum: de venstertests rekenen op kalenderdagen, niet op uren. */
export function at(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 20, 0, 0).toISOString();
}

/**
 * Bouwt een potje met bruikbare standaardwaarden: Edwin verslaat Lisanne 80-70 bij Rummikub.
 *
 * Elke aanroep van makeSessionFactory() heeft zijn eigen teller, zodat tests elkaar niet via
 * een gedeeld sessienummer kunnen beïnvloeden.
 */
export function makeSessionFactory() {
  let seq = 0;
  return function session(over: Partial<SpotlightSession> = {}): SpotlightSession {
    seq++;
    return {
      id: `s${seq}`,
      played_at: at(2026, 7, 30),
      winner_id: EDWIN.id,
      winner: EDWIN,
      notes: null,
      duration_minutes: null,
      game: RUMMIKUB,
      scores: [
        { player: EDWIN, score: 80 },
        { player: LISANNE, score: 70 },
      ],
      ...over,
    };
  };
}
