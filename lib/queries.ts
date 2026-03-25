import { createServerClient } from "@/lib/supabase/server";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getPeriodDateRange,
} from "@/lib/utils";
import type {
  Game,
  Player,
  PlayerStats,
  TopGame,
  StatsResponse,
  PeriodFilter,
  CreateSessionInput,
  CreateGameInput,
} from "@/lib/schemas";

/** Fetch all active players */
export async function getPlayers(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Failed to fetch players: ${error.message}`);
  return (data ?? []) as Player[];
}

/** Fetch all games ordered alphabetically */
export async function getGames(): Promise<Game[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("games").select("*").order("name");
  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data ?? []) as Game[];
}

/** Fetch games sorted by most recently played (for Quick Log grid) */
export async function getGamesSortedByRecent(): Promise<Game[]> {
  const supabase = createServerClient();

  const [sessionsResult, gamesResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: false }),
    supabase.from("games").select("*"),
  ]);

  if (sessionsResult.error)
    throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);
  if (gamesResult.error)
    throw new Error(`Failed to fetch games: ${gamesResult.error.message}`);

  const games = (gamesResult.data ?? []) as Game[];
  const sessions = sessionsResult.data ?? [];

  // Build a map of game_id → last played date
  const lastPlayed = new Map<string, string>();
  for (const session of sessions) {
    const gameId = session.game_id as string;
    if (!lastPlayed.has(gameId)) {
      lastPlayed.set(gameId, session.played_at as string);
    }
  }

  // Sort: recently played first, then alphabetically for never-played
  return [...games].sort((a, b) => {
    const aDate = lastPlayed.get(a.id);
    const bDate = lastPlayed.get(b.id);
    if (aDate && bDate) return bDate.localeCompare(aDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Create a new game session */
export async function createSession(input: CreateSessionInput): Promise<void> {
  const supabase = createServerClient();
  const playedAt = input.played_at ?? new Date().toISOString();
  const dayOfWeek = new Date(playedAt).getDay();

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      game_id: input.game_id,
      played_at: playedAt,
      day_of_week: dayOfWeek,
      winner_id: input.winner_id,
      starter_id: input.starter_id ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (sessionError)
    throw new Error(`Failed to create session: ${sessionError.message}`);
  if (!session) throw new Error("No session returned after insert");

  if (input.scores && input.scores.length > 0) {
    const { error: scoresError } = await supabase.from("session_players").insert(
      input.scores.map((s) => ({
        session_id: (session as { id: string }).id,
        player_id: s.player_id,
        score: s.score ?? null,
      }))
    );
    if (scoresError)
      throw new Error(`Failed to save scores: ${scoresError.message}`);
  }
}

/** Create a new game */
export async function createGame(input: CreateGameInput): Promise<Game> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`Failed to create game: ${error.message}`);
  if (!data) throw new Error("No game returned after insert");
  return data as Game;
}

/** Get stats (leaderboard, streaks, top games, recent sessions) for a period */
export async function getStats(period: PeriodFilter): Promise<StatsResponse> {
  const supabase = createServerClient();
  const dateRange = getPeriodDateRange(period);

  // Build session query with game + winner joins
  let sessionQuery = supabase
    .from("game_sessions")
    .select("*, game:games(*), winner:players!winner_id(*)")
    .order("played_at", { ascending: false });

  if (dateRange) {
    sessionQuery = sessionQuery
      .gte("played_at", dateRange.from)
      .lte("played_at", dateRange.to);
  }

  const [sessionsResult, playersResult] = await Promise.all([
    sessionQuery,
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (sessionsResult.error)
    throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);
  if (playersResult.error)
    throw new Error(`Failed to fetch players: ${playersResult.error.message}`);

  const allSessions = sessionsResult.data ?? [];
  const allPlayers = (playersResult.data ?? []) as Player[];

  // Calculate leaderboard
  const leaderboard: PlayerStats[] = allPlayers.map((player) => {
    const wins = allSessions.filter(
      (s) => (s.winner_id as string) === player.id
    ).length;

    // MVP approximation: all sessions count as total_games.
    // Edwin & Lisanne play every session; accurate per-player counts
    // would require joining session_players.
    const total_games = allSessions.length;

    const currentStreak = calculateCurrentStreak(
      allSessions.map((s) => ({ winner_id: s.winner_id as string })),
      player.id
    );
    const longestStreak = calculateLongestStreak(
      [...allSessions]
        .reverse()
        .map((s) => ({ winner_id: s.winner_id as string })),
      player.id
    );

    return {
      player,
      wins,
      total_games,
      win_percentage:
        total_games > 0 ? Math.round((wins / total_games) * 100) : 0,
      current_streak: currentStreak,
      longest_streak: longestStreak,
    };
  });

  // Sort leaderboard by wins descending
  leaderboard.sort((a, b) => b.wins - a.wins);

  // Calculate top games by play count
  const gamePlayCounts = new Map<string, { game: Game; count: number }>();
  for (const session of allSessions) {
    const game = session.game as Game;
    const existing = gamePlayCounts.get(game.id);
    if (existing) {
      existing.count++;
    } else {
      gamePlayCounts.set(game.id, { game, count: 1 });
    }
  }

  const top_games: TopGame[] = Array.from(gamePlayCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ game, count }) => ({ game, play_count: count }));

  const recent_sessions = allSessions.slice(
    0,
    10
  ) as StatsResponse["recent_sessions"];

  return { leaderboard, top_games, recent_sessions };
}
