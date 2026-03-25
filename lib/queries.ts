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

/** Fetch a single game by id */
export async function getGameById(id: string): Promise<Game | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Game;
}

/** Update an existing game */
export async function updateGame(
  id: string,
  input: Partial<CreateGameInput>
): Promise<Game> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update game: ${error.message}`);
  if (!data) throw new Error("No game returned after update");
  return data as Game;
}

export type GameDetailStats = {
  game: Game;
  totalSessions: number;
  lastPlayedAt: string | null;
  winnerStats: Array<{ player: Player; wins: number; winPercentage: number }>;
  recentSessions: Array<{
    id: string;
    played_at: string;
    winner: Player;
  }>;
};

/** Get detailed stats for a single game */
export async function getGameStats(gameId: string): Promise<GameDetailStats | null> {
  const supabase = createServerClient();

  const [gameResult, sessionsResult, playersResult] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase
      .from("game_sessions")
      .select("id, played_at, winner_id, winner:players!winner_id(*)")
      .eq("game_id", gameId)
      .order("played_at", { ascending: false }),
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (gameResult.error || !gameResult.data) return null;
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const game = gameResult.data as Game;
  const sessions = sessionsResult.data ?? [];
  const players = (playersResult.data ?? []) as Player[];
  const totalSessions = sessions.length;
  const lastPlayedAt = sessions[0]?.played_at ?? null;

  const winnerStats = players.map((player) => {
    const wins = sessions.filter((s) => s.winner_id === player.id).length;
    return {
      player,
      wins,
      winPercentage: totalSessions > 0 ? Math.round((wins / totalSessions) * 100) : 0,
    };
  }).sort((a, b) => b.wins - a.wins);

  const recentSessions = sessions.slice(0, 10).map((s) => ({
    id: s.id as string,
    played_at: s.played_at as string,
    winner: s.winner as unknown as Player,
  }));

  return { game, totalSessions, lastPlayedAt, winnerStats, recentSessions };
}

/** Get a game suggestion based on time since last played and variety */
export async function getGameSuggestion(): Promise<Game[]> {
  const supabase = createServerClient();

  const [gamesResult, sessionsResult] = await Promise.all([
    supabase.from("games").select("*"),
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: false }),
  ]);

  if (gamesResult.error) throw new Error(gamesResult.error.message);

  const games = (gamesResult.data ?? []) as Game[];
  const sessions = sessionsResult.data ?? [];

  // Build map: game_id → last played date
  const lastPlayed = new Map<string, string>();
  for (const s of sessions) {
    if (!lastPlayed.has(s.game_id as string)) {
      lastPlayed.set(s.game_id as string, s.played_at as string);
    }
  }

  const now = Date.now();

  // Score: higher = more likely to be suggested
  // Games never played get highest score; then by days since last played
  const scored = games.map((g) => {
    const last = lastPlayed.get(g.id);
    const daysSince = last
      ? (now - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
      : 9999;
    return { game: g, daysSince };
  });

  // Sort by days since played desc, pick top 5 as candidates
  scored.sort((a, b) => b.daysSince - a.daysSince);
  const candidates = scored.slice(0, Math.min(5, scored.length));

  return candidates.map((c) => c.game);
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
