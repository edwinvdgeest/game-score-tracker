import { createServerClient } from "@/lib/supabase/server";
import {
  calculateAchievements,
  type AchievementSession,
  type PlayerAchievements,
} from "@/lib/achievements";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getPeriodDateRange,
} from "@/lib/utils";
import type {
  Game,
  GameWithStats,
  Marathon,
  Player,
  PlayerStats,
  TopGame,
  StatsResponse,
  PeriodFilter,
  CreateSessionInput,
  CreateGameInput,
  UpdateSessionInput,
  CreateMarathonInput,
} from "@/lib/schemas";

/** Fetch all active players (including guests, for session forms) */
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

/** Create a guest player */
export async function createGuestPlayer(name: string): Promise<Player> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ name, emoji: "👤", is_guest: true })
    .select()
    .single();
  if (error) throw new Error(`Failed to create guest player: ${error.message}`);
  if (!data) throw new Error("No player returned after insert");
  return data as Player;
}

/** Fetch all guest players with session counts */
export async function getGuestPlayersWithCounts(): Promise<
  Array<{ player: Player; sessionCount: number }>
> {
  const supabase = createServerClient();
  const [playersResult, sessionsResult] = await Promise.all([
    supabase.from("players").select("*").eq("is_guest", true).order("name"),
    supabase.from("session_players").select("player_id"),
  ]);
  if (playersResult.error) throw new Error(playersResult.error.message);
  const players = (playersResult.data ?? []) as Player[];
  const sessions = sessionsResult.data ?? [];

  const countMap = new Map<string, number>();
  for (const sp of sessions) {
    const pid = sp.player_id as string;
    countMap.set(pid, (countMap.get(pid) ?? 0) + 1);
  }

  return players.map((player) => ({
    player,
    sessionCount: countMap.get(player.id) ?? 0,
  }));
}

/** Delete a guest player (and all their session data) */
export async function deleteGuestPlayer(id: string): Promise<void> {
  const supabase = createServerClient();
  // First verify it's actually a guest
  const { data } = await supabase
    .from("players")
    .select("is_guest")
    .eq("id", id)
    .single();
  if (!data || !(data as { is_guest: boolean }).is_guest) {
    throw new Error("Can only delete guest players");
  }
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete guest player: ${error.message}`);
}

/** Fetch all games ordered alphabetically */
export async function getGames(): Promise<Game[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("games").select("*").order("name");
  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data ?? []) as Game[];
}

/** Fetch all games enriched with mini-stats (session count, last played, top winner) */
export async function getGamesWithStats(): Promise<GameWithStats[]> {
  const supabase = createServerClient();

  const [gamesResult, sessionsResult, playersResult] = await Promise.all([
    supabase.from("games").select("*"),
    supabase
      .from("game_sessions")
      .select("game_id, played_at, winner_id")
      .order("played_at", { ascending: false }),
    supabase.from("players").select("id, name, emoji").eq("is_active", true),
  ]);

  if (gamesResult.error) throw new Error(`Failed to fetch games: ${gamesResult.error.message}`);
  if (sessionsResult.error) throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);

  const games = (gamesResult.data ?? []) as Game[];
  const sessions = sessionsResult.data ?? [];
  const players = (playersResult.data ?? []) as { id: string; name: string; emoji: string }[];

  // Build stats per game
  const statsMap = new Map<string, { count: number; lastPlayed: string | null; wins: Map<string, number> }>();
  for (const game of games) {
    statsMap.set(game.id, { count: 0, lastPlayed: null, wins: new Map() });
  }

  for (const session of sessions) {
    const gameId = session.game_id as string;
    const stat = statsMap.get(gameId);
    if (!stat) continue;
    stat.count++;
    if (!stat.lastPlayed) stat.lastPlayed = session.played_at as string;
    if (session.winner_id) {
      const winnerId = session.winner_id as string;
      stat.wins.set(winnerId, (stat.wins.get(winnerId) ?? 0) + 1);
    }
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));

  return games.map((game) => {
    const stat = statsMap.get(game.id) ?? { count: 0, lastPlayed: null, wins: new Map() };
    let topWinner: GameWithStats["topWinner"] = null;
    if (stat.count > 0 && stat.wins.size > 0) {
      let bestId = "";
      let bestWins = 0;
      for (const [pid, wins] of stat.wins) {
        if (wins > bestWins) { bestWins = wins; bestId = pid; }
      }
      const player = playerMap.get(bestId);
      if (player) {
        topWinner = {
          name: player.name,
          emoji: player.emoji,
          winPercentage: Math.round((bestWins / stat.count) * 100),
        };
      }
    }
    return {
      ...game,
      totalSessions: stat.count,
      lastPlayedAt: stat.lastPlayed,
      topWinner,
    };
  });
}

/** Toggle favorite status for a game */
export async function toggleGameFavorite(id: string, value: boolean): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("games").update({ is_favorite: value }).eq("id", id);
  if (error) throw new Error(`Failed to update favorite: ${error.message}`);
}

/** Toggle archive status for a game */
export async function toggleGameArchive(id: string, value: boolean): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("games").update({ is_archived: value }).eq("id", id);
  if (error) throw new Error(`Failed to update archive: ${error.message}`);
}

/** Fetch games sorted by most recently played (for Quick Log grid), excluding archived */
export async function getGamesSortedByRecent(): Promise<Game[]> {
  const supabase = createServerClient();

  const [sessionsResult, gamesResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: false }),
    supabase.from("games").select("*").eq("is_archived", false),
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
      winner_id: input.winner_id ?? null,
      starter_id: input.starter_id ?? null,
      notes: input.notes ?? null,
      marathon_id: input.marathon_id ?? null,
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

type UpdateGameInput = Partial<CreateGameInput> & {
  is_favorite?: boolean;
  is_archived?: boolean;
};

/** Update an existing game */
export async function updateGame(
  id: string,
  input: UpdateGameInput
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
    winner: Player | null;
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
    winner: (s.winner as unknown as Player) ?? null,
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

/** Full session detail type for history page */
export type SessionDetail = {
  id: string;
  played_at: string;
  day_of_week: number;
  winner_id: string | null;
  starter_id: string | null;
  notes: string | null;
  game: Game;
  winner: Player | null;
};

/** Fetch all sessions ordered by played_at desc */
export async function getAllSessions(): Promise<SessionDetail[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id, played_at, day_of_week, winner_id, starter_id, notes, game:games(*), winner:players!winner_id(*)")
    .order("played_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
  return (data ?? []) as unknown as SessionDetail[];
}

/** Update an existing session */
export async function updateSession(
  id: string,
  input: UpdateSessionInput
): Promise<void> {
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.winner_id !== undefined) updates.winner_id = input.winner_id;
  if (input.starter_id !== undefined) updates.starter_id = input.starter_id;
  if (input.played_at !== undefined) {
    updates.played_at = input.played_at;
    updates.day_of_week = new Date(input.played_at).getDay();
  }
  if (input.notes !== undefined) updates.notes = input.notes;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("game_sessions")
      .update(updates)
      .eq("id", id);
    if (error) throw new Error(`Failed to update session: ${error.message}`);
  }

  // Update scores if provided
  if (input.scores !== undefined) {
    // Delete existing scores and re-insert
    const { error: deleteError } = await supabase
      .from("session_players")
      .delete()
      .eq("session_id", id);
    if (deleteError) throw new Error(`Failed to delete scores: ${deleteError.message}`);

    if (input.scores.length > 0) {
      const { error: insertError } = await supabase
        .from("session_players")
        .insert(input.scores.map((s) => ({ session_id: id, player_id: s.player_id, score: s.score ?? null })));
      if (insertError) throw new Error(`Failed to insert scores: ${insertError.message}`);
    }
  }
}

/** Delete a session (and its session_players via cascade) */
export async function deleteSession(id: string): Promise<void> {
  const supabase = createServerClient();
  // Delete session_players first (in case no cascade)
  await supabase.from("session_players").delete().eq("session_id", id);
  const { error } = await supabase.from("game_sessions").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}

/** Day of week stats */
export type DayOfWeekStat = {
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayLabel: string;
  sessions: number;
  winsByPlayer: Record<string, number>; // playerId → wins
};

const DAY_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

/** Get how many sessions per day of week, and wins per player per day */
export async function getDayOfWeekStats(): Promise<{
  stats: DayOfWeekStat[];
  players: Player[];
}> {
  const supabase = createServerClient();
  const [sessionsResult, playersResult] = await Promise.all([
    supabase.from("game_sessions").select("day_of_week, winner_id"),
    supabase.from("players").select("*").eq("is_active", true).eq("is_guest", false),
  ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const sessions = sessionsResult.data ?? [];
  const players = (playersResult.data ?? []) as Player[];

  // Build stats for each day (0-6)
  const stats: DayOfWeekStat[] = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    dayLabel: DAY_LABELS[i] ?? "",
    sessions: 0,
    winsByPlayer: {},
  }));

  for (const session of sessions) {
    const day = session.day_of_week as number;
    const winnerId = session.winner_id as string;
    const dayStat = stats[day];
    if (!dayStat) continue;
    dayStat.sessions++;
    dayStat.winsByPlayer[winnerId] = (dayStat.winsByPlayer[winnerId] ?? 0) + 1;
  }

  return { stats, players };
}

/** Get achievements for all active players */
export async function getPlayerAchievements(): Promise<PlayerAchievements[]> {
  const supabase = createServerClient();

  const [sessionsResult, sessionPlayersResult, playersResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("id, played_at, game_id, winner_id")
      .order("played_at", { ascending: true }),
    supabase.from("session_players").select("session_id, player_id"),
    supabase.from("players").select("*").eq("is_active", true).eq("is_guest", false),
  ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (sessionPlayersResult.error) throw new Error(sessionPlayersResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const rawSessions = sessionsResult.data ?? [];
  const sessionPlayers = sessionPlayersResult.data ?? [];
  const players = (playersResult.data ?? []) as Player[];

  // Build map session_id → player IDs
  const sessionPlayerMap = new Map<string, string[]>();
  for (const sp of sessionPlayers) {
    const arr = sessionPlayerMap.get(sp.session_id as string) ?? [];
    arr.push(sp.player_id as string);
    sessionPlayerMap.set(sp.session_id as string, arr);
  }

  // Build AchievementSession objects
  // If session_players is empty for a session, assume all active players participated
  const allPlayerIds = players.map((p) => p.id);
  const achievementSessions: AchievementSession[] = rawSessions.map((s) => ({
    id: s.id as string,
    played_at: s.played_at as string,
    game_id: s.game_id as string,
    winner_id: s.winner_id as string,
    players: sessionPlayerMap.get(s.id as string) ?? allPlayerIds,
  }));

  return players.map((player) => {
    const achievements = calculateAchievements(achievementSessions, player.id);
    return {
      player,
      achievements,
      earnedCount: achievements.filter((a) => a.earnedAt !== null).length,
    };
  });
}

/** Starter advantage stat per game */
export type StarterStat = {
  totalWithStarter: number;
  starterWins: number;
  starterWinPercentage: number;
};

/** Calculate starter advantage for a specific game */
export async function getStarterStats(gameId: string): Promise<StarterStat | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("winner_id, starter_id")
    .eq("game_id", gameId)
    .not("starter_id", "is", null);

  if (error) throw new Error(error.message);
  const sessions = data ?? [];
  if (sessions.length < 3) return null; // Too few data points

  const starterWins = sessions.filter((s) => s.winner_id === s.starter_id).length;
  return {
    totalWithStarter: sessions.length,
    starterWins,
    starterWinPercentage: Math.round((starterWins / sessions.length) * 100),
  };
}

/** Get stats (leaderboard, streaks, top games, recent sessions) for a period */
export async function getStats(
  period: PeriodFilter,
  gameId?: string | null
): Promise<StatsResponse> {
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

  if (gameId) {
    sessionQuery = sessionQuery.eq("game_id", gameId);
  }

  const [sessionsResult, playersResult] = await Promise.all([
    sessionQuery,
    supabase.from("players").select("*").eq("is_active", true).eq("is_guest", false),
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

// ─── Marathon queries ────────────────────────────────────────────────────────

/** Start een nieuwe marathon */
export async function createMarathon(input: CreateMarathonInput): Promise<Marathon> {
  const supabase = createServerClient();
  // Deactiveer eerst eventuele andere actieve marathons
  await supabase.from("marathons").update({ is_active: false }).eq("is_active", true);

  const { data, error } = await supabase
    .from("marathons")
    .insert({ name: input.name, is_active: true })
    .select()
    .single();
  if (error) throw new Error(`Failed to create marathon: ${error.message}`);
  if (!data) throw new Error("No marathon returned after insert");
  return data as Marathon;
}

/** Haal de actieve marathon op (of null) */
export async function getActiveMarathon(): Promise<Marathon | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("marathons")
    .select("*")
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch active marathon: ${error.message}`);
  return data as Marathon | null;
}

export type MarathonSessionDetail = {
  id: string;
  played_at: string;
  winner_id: string | null;
  game: { id: string; name: string; emoji: string };
  winner: { id: string; name: string; emoji: string } | null;
  scores: Array<{ player_id: string; score: number | null }>;
};

export type MarathonDetail = {
  marathon: Marathon;
  sessions: MarathonSessionDetail[];
  players: Player[];
  winCounts: Record<string, number>; // playerId → aantal wins
  mostPlayedGame: { name: string; emoji: string; count: number } | null;
  longestStreak: { player: Player; streak: number } | null;
};

/** Gedetailleerde live data voor een specifieke marathon */
export async function getMarathonDetail(marathonId: string): Promise<MarathonDetail | null> {
  const supabase = createServerClient();

  const [marathonResult, sessionsResult, playersResult] = await Promise.all([
    supabase.from("marathons").select("*").eq("id", marathonId).single(),
    supabase
      .from("game_sessions")
      .select("id, played_at, winner_id, game:games(id,name,emoji), winner:players!winner_id(id,name,emoji)")
      .eq("marathon_id", marathonId)
      .order("played_at", { ascending: true }),
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (marathonResult.error || !marathonResult.data) return null;
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const marathon = marathonResult.data as Marathon;
  const sessions = (sessionsResult.data ?? []) as unknown as MarathonSessionDetail[];
  const players = (playersResult.data ?? []) as Player[];

  // Win counts per speler
  const winCounts: Record<string, number> = {};
  for (const s of sessions) {
    if (s.winner_id) {
      winCounts[s.winner_id] = (winCounts[s.winner_id] ?? 0) + 1;
    }
  }

  // Meest gespeeld spel
  const gameCounts = new Map<string, { name: string; emoji: string; count: number }>();
  for (const s of sessions) {
    const g = s.game;
    if (g) {
      const existing = gameCounts.get(g.id);
      if (existing) existing.count++;
      else gameCounts.set(g.id, { name: g.name, emoji: g.emoji, count: 1 });
    }
  }
  const mostPlayedGame = gameCounts.size > 0
    ? Array.from(gameCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null
    : null;

  // Langste winstreak per speler
  let longestStreak: { player: Player; streak: number } | null = null;
  for (const player of players) {
    let maxStreak = 0;
    let cur = 0;
    for (const s of sessions) {
      if (s.winner_id === player.id) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 0;
    }
    if (maxStreak > 0 && (longestStreak === null || maxStreak > longestStreak.streak)) {
      longestStreak = { player, streak: maxStreak };
    }
  }

  return { marathon, sessions, players, winCounts, mostPlayedGame, longestStreak };
}

/** Beëindig een marathon */
export async function endMarathon(id: string): Promise<Marathon> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("marathons")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to end marathon: ${error.message}`);
  if (!data) throw new Error("No marathon returned after update");
  return data as Marathon;
}

export type MarathonSummary = {
  marathon: Marathon;
  sessionCount: number;
  winner: Player | null;
  gamesPlayed: string[];
};

/** Alle afgesloten marathons als overzicht */
export async function getMarathonHistory(): Promise<MarathonSummary[]> {
  const supabase = createServerClient();

  const [marathonsResult, sessionsResult, playersResult] = await Promise.all([
    supabase.from("marathons").select("*").order("started_at", { ascending: false }),
    supabase
      .from("game_sessions")
      .select("marathon_id, winner_id, game:games(name,emoji)")
      .not("marathon_id", "is", null),
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (marathonsResult.error) throw new Error(marathonsResult.error.message);
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);

  const marathons = (marathonsResult.data ?? []) as Marathon[];
  const allSessions = sessionsResult.data ?? [];
  const players = (playersResult.data ?? []) as Player[];
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return marathons.map((m) => {
    const mSessions = allSessions.filter((s) => s.marathon_id === m.id);
    const sessionCount = mSessions.length;

    // Winnaar = meeste wins
    const wins: Record<string, number> = {};
    for (const s of mSessions) {
      if (s.winner_id) wins[s.winner_id] = (wins[s.winner_id] ?? 0) + 1;
    }
    let winnerId: string | null = null;
    let maxWins = 0;
    for (const [pid, w] of Object.entries(wins)) {
      if (w > maxWins) { maxWins = w; winnerId = pid; }
    }

    const gamesSet = new Set<string>();
    for (const s of mSessions) {
      const g = s.game as unknown as { name: string; emoji: string } | null;
      if (g) gamesSet.add(`${g.emoji} ${g.name}`);
    }

    return {
      marathon: m,
      sessionCount,
      winner: winnerId ? (playerMap.get(winnerId) ?? null) : null,
      gamesPlayed: Array.from(gamesSet),
    };
  });
}
