import type { Player, PlayerStats } from "@/lib/schemas";
import { calculateCurrentStreak, calculateLongestStreak } from "@/lib/utils";

/**
 * The minimal shape the statistics need from a session.
 *
 * `player_ids` is the single definition of "took part" in this codebase. Everything that
 * counts games played, win percentages or streaks must go through it — counting all
 * sessions as played by everyone is what made the old leaderboard wrong as soon as a
 * third player or a guest joined.
 */
export type StatSession = {
  id: string;
  played_at: string;
  winner_id: string | null;
  player_ids: string[];
};

/** Did this player take part in this session? */
export function didPlay(session: StatSession, playerId: string): boolean {
  return session.player_ids.includes(playerId);
}

/** Only the sessions this player took part in, order preserved. */
export function playedSessions(
  sessions: StatSession[],
  playerId: string
): StatSession[] {
  return sessions.filter((s) => didPlay(s, playerId));
}

/**
 * Wins, games played, win percentage and streaks for one player.
 *
 * A draw (winner_id === null) counts as a game played but not as a win. A draw is a game
 * you sat down for, so leaving it out of the denominator would inflate the percentage.
 * Consequence: with draws in the history the win percentages of two players who play
 * everything together add up to less than 100%.
 *
 * `sessions` must be sorted by played_at descending (newest first).
 */
export function computePlayerStats(
  sessions: StatSession[],
  player: Player
): PlayerStats {
  const mine = playedSessions(sessions, player.id);
  const wins = mine.filter((s) => s.winner_id === player.id).length;
  const total_games = mine.length;

  return {
    player,
    wins,
    total_games,
    win_percentage:
      total_games > 0 ? Math.round((wins / total_games) * 100) : 0,
    current_streak: calculateCurrentStreak(mine, player.id),
    // calculateLongestStreak expects oldest-first.
    longest_streak: calculateLongestStreak([...mine].reverse(), player.id),
  };
}

/**
 * Leaderboard, best first.
 *
 * Sorted on wins rather than win percentage: a guest with a single game and a single win
 * would otherwise top the board. Ties break on percentage, then on games played.
 *
 * `sessions` must be sorted by played_at descending (newest first).
 */
export function computeLeaderboard(
  sessions: StatSession[],
  players: Player[]
): PlayerStats[] {
  return players
    .map((player) => computePlayerStats(sessions, player))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.win_percentage - a.win_percentage ||
        b.total_games - a.total_games
    );
}

/**
 * Who won, derived from the scores.
 *
 * Returns null for a draw and for a session without any score. `lowestWins` flips the
 * comparison for games where the lowest score wins.
 */
export function computeWinner(
  entries: Array<{ player_id: string; score: number | null }>,
  lowestWins = false
): string | null {
  const scored = entries.filter(
    (e): e is { player_id: string; score: number } => e.score !== null
  );
  if (scored.length === 0) return null;

  const best = lowestWins
    ? Math.min(...scored.map((e) => e.score))
    : Math.max(...scored.map((e) => e.score));

  const tops = scored.filter((e) => e.score === best);
  const solo = tops[0];
  return tops.length === 1 && solo ? solo.player_id : null;
}

/**
 * Parses the raw score strings from a form into the shape computeWinner and the API
 * expect. An empty or non-numeric field becomes null, which means "no score entered".
 */
export function parseScoreEntries(
  playerIds: string[],
  raw: Record<string, string>
): Array<{ player_id: string; score: number | null }> {
  return playerIds.map((player_id) => {
    const value = raw[player_id]?.trim() ?? "";
    if (value === "") return { player_id, score: null };
    const parsed = Number.parseInt(value, 10);
    return { player_id, score: Number.isNaN(parsed) ? null : parsed };
  });
}
