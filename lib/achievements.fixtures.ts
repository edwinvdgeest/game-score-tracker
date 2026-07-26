import type { AchievementSession } from "@/lib/achievements";
import { calculateAchievements } from "@/lib/achievements";

/** Player ids used across the achievement tests. */
export const E = "edwin";
export const L = "lisanne";

/**
 * Builds sessions with sensible defaults: Edwin beats Lisanne 10-5 at a medium-difficulty
 * board game, one day later than the previous session.
 *
 * Each call to makeSessionFactory() gets its own counter, so tests cannot influence each
 * other through a shared sequence number.
 */
export function makeSessionFactory() {
  let seq = 0;
  return function session(
    over: Partial<AchievementSession> = {}
  ): AchievementSession {
    seq++;
    return {
      id: `s${seq}`,
      played_at: new Date(
        Date.UTC(2025, 0, 1, 12, 0, 0) + seq * 86400000
      ).toISOString(),
      game_id: "g1",
      winner_id: E,
      starter_id: null,
      marathon_id: null,
      duration_minutes: null,
      game_category: "bordspel",
      game_difficulty: 2,
      lowest_score_wins: false,
      players: [E, L],
      scores: { [E]: 10, [L]: 5 },
      ...over,
    };
  };
}

/** Ids of the badges a player has earned from these sessions. */
export function earned(
  sessions: AchievementSession[],
  playerId: string,
  guests: string[] = []
): string[] {
  return calculateAchievements(sessions, playerId, { guestPlayerIds: guests })
    .filter((a) => a.earnedAt !== null)
    .map((a) => a.id);
}
