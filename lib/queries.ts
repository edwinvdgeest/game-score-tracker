import { createServerClient } from "@/lib/supabase/server";
import {
  calculateAchievements,
  type Achievement,
  type AchievementContext,
  type AchievementSession,
  type PlayerAchievements,
} from "@/lib/achievements";
import { getPeriodDateRange } from "@/lib/utils";
import { computeLeaderboard, type StatSession } from "@/lib/stats";
import { normalizeRoundConfig, sameParticipantScores } from "@/lib/rounds";
import {
  computeHeadToHead,
  type DuelSession,
  type HeadToHead,
} from "@/lib/duel";
import {
  buildSpotlightCards,
  computeGameRecap,
  MEMORY_MAX_YEARS_BACK,
  type GameRecap,
  type SpotlightCard,
  type SpotlightGame,
  type SpotlightPlayer,
  type SpotlightSession,
} from "@/lib/spotlight";
import {
  championOf,
  computeStandings,
  isSameSeason,
  seasonLabel,
  seasonOf,
  seasonRange,
  seasonsWithSessions,
  type SeasonRef,
  type SeasonSession,
  type SeasonStanding,
} from "@/lib/seasons";
import type {
  Game,
  GameWithStats,
  HypeFact,
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
  CreatePlayerInput,
  UpdatePlayerInput,
  SessionBadge,
  ParentGameRef,
  GameMetadataPatch,
} from "@/lib/schemas";

/** Fetch all active players (inclusief gastspelers) */
export async function getPlayers(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("is_guest")   // vaste spelers eerst
    .order("name");
  if (error) throw new Error(`Failed to fetch players: ${error.message}`);
  return (data ?? []) as Player[];
}

/** Alle spelers, inclusief inactieve — alleen voor de beheerpagina */
export async function getAllPlayers(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("is_guest")
    .order("name");
  if (error) throw new Error(`Failed to fetch players: ${error.message}`);
  return (data ?? []) as Player[];
}

/** Maak een speler aan. Zonder is_guest is het een vaste speler. */
export async function createPlayer(input: CreatePlayerInput): Promise<Player> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      name: input.name,
      emoji: input.emoji,
      is_guest: input.is_guest ?? false,
      include_by_default: input.include_by_default ?? false,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create player: ${error.message}`);
  if (!data) throw new Error("No player returned after insert");
  return data as Player;
}

/** Wijzig naam, emoji, actief-status of standaard-deelname van een speler */
export async function updatePlayer(
  id: string,
  input: UpdatePlayerInput
): Promise<Player> {
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.emoji !== undefined) updates.emoji = input.emoji;
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.include_by_default !== undefined)
    updates.include_by_default = input.include_by_default;

  if (Object.keys(updates).length === 0) {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(`Failed to fetch player: ${error.message}`);
    return data as Player;
  }

  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update player: ${error.message}`);
  if (!data) throw new Error("No player returned after update");
  return data as Player;
}

/**
 * Deactiveer een speler die in sessies voorkomt, of verwijder hem als dat niet zo is.
 *
 * Deactiveren beschermt de historie: session_players.player_id heeft ON DELETE RESTRICT,
 * dus een speler met potjes weggooien zou de database weigeren.
 *
 * Voorheen zat hier een .eq("is_guest", true) op zowel de update als de delete. Bij een
 * vaste speler matchte dat nul rijen, gaf Supabase geen error, en retourneerde de API
 * gewoon 204 zonder dat er iets gebeurde.
 */
export async function deleteOrDeactivatePlayer(id: string): Promise<void> {
  const supabase = createServerClient();

  // Check of de speler in sessies voorkomt
  const { count } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("player_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("players")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw new Error(`Failed to deactivate player: ${error.message}`);
  } else {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete player: ${error.message}`);
  }
}

/**
 * Kolommen voor lijstweergaven. Bewust zonder description/rules_summary: die zijn
 * samen al gauw tientallen KB's over alle spellen, worden op /api/games bij elke
 * quick-log paginalading meegestuurd en door de service worker gecachet, terwijl
 * alleen de detailpagina ze nodig heeft.
 */
const GAME_LIST_COLUMNS =
  "id, name, emoji, category, min_players, max_players, difficulty, created_at, " +
  "is_favorite, is_archived, lowest_score_wins, image_url, thumbnail_url, " +
  "variant_note, parent_game_id, text_source, text_locked, " +
  // Speelregels die de wizard nodig heeft om de juiste stappen te tonen. Vergeet je ze
  // hier, dan zijn ze undefined op elk spel in de quick-log en valt alles stil terug op
  // het oude gedrag — terwijl de spelpagina (select "*") ze wél laat zien.
  "starter_matters, round_format, round_count, round_target";

/** Hoofdspel-velden die een variant kan erven, als embedded select. */
const PARENT_EMBED =
  "parent:parent_game_id ( id, name, emoji, image_url, thumbnail_url, description, rules_summary )";

/** Fetch all games ordered alphabetically */
export async function getGames(): Promise<Game[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_LIST_COLUMNS)
    .order("name");
  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data ?? []) as unknown as Game[];
}

/** Fetch all games enriched with mini-stats (session count, last played, top winner) */
export async function getGamesWithStats(): Promise<GameWithStats[]> {
  const supabase = createServerClient();

  const [gamesResult, sessionsResult, playersResult] = await Promise.all([
    // Eén embedded select in plaats van een tweede ronde per variant: anders
    // levert de doosfoto-overerving een N+1 op de spellenpagina op.
    supabase.from("games").select(`${GAME_LIST_COLUMNS}, ${PARENT_EMBED}`),
    supabase
      .from("game_sessions")
      .select("game_id, played_at, winner_id")
      .order("played_at", { ascending: false }),
    supabase.from("players").select("id, name, emoji").eq("is_active", true),
  ]);

  if (gamesResult.error) throw new Error(`Failed to fetch games: ${gamesResult.error.message}`);
  if (sessionsResult.error) throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);

  const games = (gamesResult.data ?? []) as unknown as (Game & { parent?: ParentGameRef | null })[];
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
    supabase.from("games").select(`${GAME_LIST_COLUMNS}, ${PARENT_EMBED}`).eq("is_archived", false),
  ]);

  if (sessionsResult.error)
    throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);
  if (gamesResult.error)
    throw new Error(`Failed to fetch games: ${gamesResult.error.message}`);

  const games = (gamesResult.data ?? []) as unknown as Game[];
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

/** Create a new game session. Returns the new session id so the client can fetch highlights. */
export async function createSession(
  input: CreateSessionInput
): Promise<{ id: string }> {
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
      duration_minutes: input.duration_minutes ?? null,
    })
    .select("id")
    .single();

  if (sessionError)
    throw new Error(`Failed to create session: ${sessionError.message}`);
  if (!session) throw new Error("No session returned after insert");

  const sessionId = (session as { id: string }).id;

  if (input.scores && input.scores.length > 0) {
    const { error: scoresError } = await supabase.from("session_players").insert(
      input.scores.map((s) => ({
        session_id: sessionId,
        player_id: s.player_id,
        score: s.score ?? null,
      }))
    );
    if (scoresError)
      throw new Error(`Failed to save scores: ${scoresError.message}`);
  }

  // Na de deelnemers, want die dragen het eindtotaal en dát is wat alle statistieken
  // lezen. De rondes zijn de onderbouwing; input.scores moet al de som hiervan zijn.
  // De server rekent dat niet na, net zomin als hij winner_id narekent.
  if (input.rounds && input.rounds.length > 0) {
    const { error: roundsError } = await supabase.from("session_rounds").insert(
      input.rounds.map((r) => ({
        session_id: sessionId,
        round_number: r.round_number,
        player_id: r.player_id,
        score: r.score ?? null,
      }))
    );
    if (roundsError)
      throw new Error(`Failed to save rounds: ${roundsError.message}`);
  }

  return { id: sessionId };
}

/** Create a new game */
export async function createGame(input: CreateGameInput): Promise<Game> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    // Normaliseren op het schrijfpad, niet in het Zod-schema: een .superRefine zou
    // createGameSchema.partial() slopen, en daar leunt de PUT-route op.
    .insert(normalizeRoundConfig(input))
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
    .update(normalizeRoundConfig(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update game: ${error.message}`);
  if (!data) throw new Error("No game returned after update");
  return data as Game;
}

/**
 * Schrijft metadata weg (doosfoto, tekst, variant-koppeling). Bewust een aparte
 * functie met een eigen type naast updateGame: het bewerkformulier doet een volledige
 * PUT met updateGame, en die mag deze velden niet aanraken.
 */
export async function updateGameMetadata(
  id: string,
  patch: GameMetadataPatch
): Promise<Game> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update game metadata: ${error.message}`);
  if (!data) throw new Error("No game returned after metadata update");
  return data as Game;
}

export type GameDetailStats = {
  game: Game & { parent?: ParentGameRef | null };
  totalSessions: number;
  lastPlayedAt: string | null;
  avgDuration: number | null;
  winnerStats: Array<{ player: Player; wins: number; winPercentage: number }>;
  recentSessions: Array<{
    id: string;
    played_at: string;
    winner: Player | null;
    duration_minutes: number | null;
    notes: string | null;
  }>;
};

/** Get detailed stats for a single game */
export async function getGameStats(gameId: string): Promise<GameDetailStats | null> {
  const supabase = createServerClient();

  const [gameResult, sessionsResult, playersResult] = await Promise.all([
    supabase.from("games").select(`*, ${PARENT_EMBED}`).eq("id", gameId).single(),
    supabase
      .from("game_sessions")
      .select(
        "id, played_at, winner_id, duration_minutes, notes, winner:players!winner_id(*)"
      )
      .eq("game_id", gameId)
      .order("played_at", { ascending: false }),
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (gameResult.error || !gameResult.data) return null;
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const game = gameResult.data as unknown as GameDetailStats["game"];
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

  const durationsWithValue = sessions
    .map((s) => s.duration_minutes as number | null)
    .filter((d): d is number => d !== null && d > 0);
  const avgDuration =
    durationsWithValue.length > 0
      ? Math.round(durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length)
      : null;

  const recentSessions = sessions.slice(0, 10).map((s) => ({
    id: s.id as string,
    played_at: s.played_at as string,
    winner: (s.winner as unknown as Player) ?? null,
    duration_minutes: (s.duration_minutes as number | null) ?? null,
    notes: (s.notes as string | null) ?? null,
  }));

  return { game, totalSessions, lastPlayedAt, avgDuration, winnerStats, recentSessions };
}

/** Get a game suggestion based on time since last played and variety */
export async function getGameSuggestion(playerCount?: number): Promise<Game[]> {
  const supabase = createServerClient();

  const [gamesResult, sessionsResult] = await Promise.all([
    supabase.from("games").select(`${GAME_LIST_COLUMNS}, ${PARENT_EMBED}`).eq("is_archived", false),
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: false }),
  ]);

  if (gamesResult.error) throw new Error(gamesResult.error.message);

  let games = (gamesResult.data ?? []) as unknown as Game[];
  const sessions = sessionsResult.data ?? [];

  // Filter by player count if provided
  if (playerCount && playerCount > 0) {
    games = games.filter((g) => {
      const minOk = !g.min_players || g.min_players <= playerCount;
      const maxOk = !g.max_players || g.max_players >= playerCount;
      return minOk && maxOk;
    });
  }

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
  /** Deelnemers met hun score. Nodig om een score in /history te kunnen corrigeren. */
  scores: Array<{ player: Player; score: number | null }>;
  /**
   * Hoeveel rijen er in session_rounds staan — alleen een telling, want dit antwoord
   * gaat over álle sessies en wordt door de service worker gecachet. De rondes zelf
   * komen pas los binnen via /api/sessions/[id]/rounds als je ze uitklapt.
   *
   * Niet af te leiden uit game.round_format: een oud potje van een spel dat pas later
   * op rondes is gezet heeft er geen.
   */
  rounds: Array<{ count: number }>;
};

/** Fetch all sessions ordered by played_at desc */
export async function getAllSessions(): Promise<SessionDetail[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, played_at, day_of_week, winner_id, starter_id, notes, game:games(*), winner:players!winner_id(*), scores:session_players(player:players(*), score), rounds:session_rounds(count)"
    )
    .order("played_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
  return (data ?? []) as unknown as SessionDetail[];
}

// ─── Jaaroverzicht ("Wrapped") ────────────────────────────────────────────────

export type WrappedResponse = {
  year: number;
  sessionCount: number;
  /** Totale speelduur in minuten, voor zover ingevuld. */
  totalMinutes: number;
  leaderboard: PlayerStats[];
  topGames: TopGame[];
  /** Spel waarvan het eerste potje ooit in dit jaar viel. */
  newGame: { game: Game; firstPlayedAt: string } | null;
  bestScore: { score: number; player: Player; game: Game } | null;
  /** Weekdag waarop het vaakst gespeeld is, 0 = zondag. */
  favouriteDay: { day: number; label: string; sessions: number } | null;
  /** Kampioenen van de afgesloten seizoenen in dit jaar. */
  seasonChampions: Array<{ season: SeasonRef; label: string; champion: Player }>;
  longestStreak: { player: Player; length: number } | null;
};

/**
 * Alles voor het jaaroverzicht in één keer.
 *
 * Dit gaat bewust niet via getStats: die neemt een PeriodFilter en kan dus alleen "dit
 * jaar" of "vorig jaar". Met een eigen jaargrens werkt elk jaar uit de historie, en de
 * rekenkern blijft gedeeld — computeLeaderboard en computeStandings zijn dezelfde functies
 * die het scorebord en de seizoenspagina gebruiken.
 */
export async function getWrapped(year: number): Promise<WrappedResponse> {
  const supabase = createServerClient();
  const from = new Date(year, 0, 1).toISOString();
  const to = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

  const [sessionsResult, playersResult, firstPlayResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("id, played_at, day_of_week, winner_id, duration_minutes, game:games(*)")
      .gte("played_at", from)
      .lte("played_at", to)
      .order("played_at", { ascending: false }),
    supabase.from("players").select("*").eq("is_guest", false),
    // Alle potjes ooit, alleen spel en datum: nodig om te bepalen of een spel in dit jaar
    // zijn debuut maakte.
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: true }),
  ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);
  if (firstPlayResult.error) throw new Error(firstPlayResult.error.message);

  const rawSessions = (sessionsResult.data ?? []) as unknown as Array<{
    id: string;
    played_at: string;
    day_of_week: number;
    winner_id: string | null;
    duration_minutes: number | null;
    game: Game;
  }>;
  const players = (playersResult.data ?? []) as Player[];

  // Deelnemers en scores per potje.
  const sessionIds = rawSessions.map((s) => s.id);
  const scoresBySession = new Map<
    string,
    Array<{ player: Player; score: number | null }>
  >();

  if (sessionIds.length > 0) {
    const { data: spData, error: spError } = await supabase
      .from("session_players")
      .select("session_id, score, player:players(*)")
      .in("session_id", sessionIds);
    if (spError) throw new Error(spError.message);

    for (const sp of spData ?? []) {
      const sessionId = sp.session_id as string;
      const arr = scoresBySession.get(sessionId) ?? [];
      arr.push({
        player: sp.player as unknown as Player,
        score: sp.score as number | null,
      });
      scoresBySession.set(sessionId, arr);
    }
  }

  const statSessions: StatSession[] = rawSessions.map((s) => ({
    id: s.id,
    played_at: s.played_at,
    winner_id: s.winner_id,
    player_ids: (scoresBySession.get(s.id) ?? []).map((entry) => entry.player.id),
  }));

  const leaderboard = computeLeaderboard(statSessions, players);

  // Meest gespeelde spellen.
  const playCounts = new Map<string, { game: Game; count: number }>();
  for (const session of rawSessions) {
    const existing = playCounts.get(session.game.id);
    if (existing) existing.count++;
    else playCounts.set(session.game.id, { game: session.game, count: 1 });
  }
  const topGames: TopGame[] = [...playCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ game, count }) => ({ game, play_count: count }));

  // Nieuw spel van het jaar: het eerste potje ooit van dat spel viel in dit jaar. Bij
  // meerdere pakken we het spel dat daarna het vaakst gespeeld is.
  const firstPlayByGame = new Map<string, string>();
  for (const row of (firstPlayResult.data ?? []) as Array<{
    game_id: string;
    played_at: string;
  }>) {
    if (!firstPlayByGame.has(row.game_id)) {
      firstPlayByGame.set(row.game_id, row.played_at);
    }
  }
  let newGame: WrappedResponse["newGame"] = null;
  for (const { game, count } of [...playCounts.values()].sort(
    (a, b) => b.count - a.count
  )) {
    const firstPlayedAt = firstPlayByGame.get(game.id);
    if (firstPlayedAt && new Date(firstPlayedAt).getFullYear() === year) {
      newGame = { game, firstPlayedAt };
      break;
    }
    void count;
  }

  // Hoogste score van het jaar.
  let bestScore: WrappedResponse["bestScore"] = null;
  for (const session of rawSessions) {
    for (const entry of scoresBySession.get(session.id) ?? []) {
      if (entry.score === null) continue;
      // Bij een spel waar de laagste score wint zegt een hoge score niets.
      if (session.game.lowest_score_wins) continue;
      if (!bestScore || entry.score > bestScore.score) {
        bestScore = { score: entry.score, player: entry.player, game: session.game };
      }
    }
  }

  // Favoriete speeldag.
  const dayCounts = new Array(7).fill(0) as number[];
  for (const session of rawSessions) {
    const day = session.day_of_week;
    if (day >= 0 && day <= 6) dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  let favouriteDay: WrappedResponse["favouriteDay"] = null;
  for (let day = 0; day < 7; day++) {
    const sessions = dayCounts[day] ?? 0;
    if (sessions > 0 && (!favouriteDay || sessions > favouriteDay.sessions)) {
      favouriteDay = { day, label: DAY_LABELS[day] ?? "", sessions };
    }
  }

  // Seizoenskampioenen van dit jaar, alleen van afgesloten kwartalen.
  const seasonSessions: SeasonSession[] = rawSessions.map((s) => ({
    id: s.id,
    played_at: s.played_at,
    winner_id: s.winner_id,
    player_ids: (scoresBySession.get(s.id) ?? []).map((entry) => entry.player.id),
  }));
  const currentSeason = seasonOf(new Date());
  const seasonChampions: WrappedResponse["seasonChampions"] = [];
  for (const season of seasonsWithSessions(seasonSessions)) {
    if (isSameSeason(season, currentSeason)) continue;
    const inSeason = seasonSessions.filter((s) =>
      isSameSeason(seasonOf(s.played_at), season)
    );
    const champion = championOf(computeStandings(inSeason, players));
    if (champion) {
      seasonChampions.push({
        season,
        label: seasonLabel(season),
        champion: champion.player,
      });
    }
  }

  const longestStreakEntry = leaderboard.reduce<PlayerStats | null>(
    (best, entry) =>
      !best || entry.longest_streak > best.longest_streak ? entry : best,
    null
  );

  return {
    year,
    sessionCount: rawSessions.length,
    totalMinutes: rawSessions.reduce(
      (sum, s) => sum + (s.duration_minutes ?? 0),
      0
    ),
    leaderboard,
    topGames,
    newGame,
    bestScore,
    favouriteDay,
    seasonChampions,
    longestStreak:
      longestStreakEntry && longestStreakEntry.longest_streak > 1
        ? {
            player: longestStreakEntry.player,
            length: longestStreakEntry.longest_streak,
          }
        : null,
  };
}

/** Jaren waarin gespeeld is, nieuwste eerst. */
export async function getPlayedYears(): Promise<number[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("played_at")
    .order("played_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch years: ${error.message}`);

  const years = new Set<number>();
  for (const row of (data ?? []) as Array<{ played_at: string }>) {
    years.add(new Date(row.played_at).getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// ─── Seizoenen ────────────────────────────────────────────────────────────────

export type SeasonStandingsResponse = {
  season: SeasonRef;
  label: string;
  standings: SeasonStanding[];
  champion: SeasonStanding | null;
  /** Is dit het seizoen dat nu loopt? Dan is de stand nog niet definitief. */
  isCurrent: boolean;
  sessionCount: number;
};

/** Alle sessies met hun deelnemers, in de vorm die de seizoensberekening nodig heeft. */
async function loadSeasonSessions(range?: {
  from: string;
  to: string;
}): Promise<SeasonSession[]> {
  const supabase = createServerClient();

  let query = supabase
    .from("game_sessions")
    .select("id, played_at, winner_id")
    .order("played_at", { ascending: false });

  if (range) {
    query = query.gte("played_at", range.from).lte("played_at", range.to);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);

  const rawSessions = (data ?? []) as Array<{
    id: string;
    played_at: string;
    winner_id: string | null;
  }>;

  const sessionIds = rawSessions.map((s) => s.id);
  const playersBySession = new Map<string, string[]>();

  if (sessionIds.length > 0) {
    const { data: spData, error: spError } = await supabase
      .from("session_players")
      .select("session_id, player_id")
      .in("session_id", sessionIds);
    if (spError) throw new Error(spError.message);

    for (const sp of (spData ?? []) as Array<{
      session_id: string;
      player_id: string;
    }>) {
      const arr = playersBySession.get(sp.session_id) ?? [];
      arr.push(sp.player_id);
      playersBySession.set(sp.session_id, arr);
    }
  }

  return rawSessions.map((s) => ({
    id: s.id,
    played_at: s.played_at,
    winner_id: s.winner_id,
    player_ids: playersBySession.get(s.id) ?? [],
  }));
}

/** Alle seizoenen waarin gespeeld is, nieuwste eerst. */
export async function getSeasonList(): Promise<SeasonRef[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("played_at")
    .order("played_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch seasons: ${error.message}`);

  return seasonsWithSessions(
    ((data ?? []) as Array<{ played_at: string }>).map((s) => ({
      id: "",
      played_at: s.played_at,
      winner_id: null,
      player_ids: [],
    }))
  );
}

/** De stand van een seizoen. Zonder ref: het seizoen dat nu loopt. */
export async function getSeasonStandings(
  ref?: SeasonRef
): Promise<SeasonStandingsResponse> {
  const supabase = createServerClient();
  const season = ref ?? seasonOf(new Date());
  const range = seasonRange(season);

  const [sessions, playersResult] = await Promise.all([
    loadSeasonSessions(range),
    // Gasten doen niet mee aan de seizoenscompetitie, net als in het hoofd-leaderboard.
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .eq("is_guest", false),
  ]);

  if (playersResult.error) throw new Error(playersResult.error.message);
  const players = (playersResult.data ?? []) as Player[];

  const standings = computeStandings(sessions, players);

  return {
    season,
    label: seasonLabel(season),
    standings,
    champion: championOf(standings),
    isCurrent: isSameSeason(season, seasonOf(new Date())),
    sessionCount: sessions.length,
  };
}

/**
 * De kampioen van elk afgesloten seizoen, nieuwste eerst — de trofeeënkast.
 *
 * Live berekend, niet bevroren in een tabel. Dat kan omdat seizoenen uit played_at
 * afgeleid worden; het scheelt een migratie en het blijft automatisch klopppen als je in
 * /history een datum of score corrigeert.
 */
export async function getSeasonHistory(): Promise<SeasonStandingsResponse[]> {
  const supabase = createServerClient();

  const [sessions, playersResult] = await Promise.all([
    loadSeasonSessions(),
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .eq("is_guest", false),
  ]);

  if (playersResult.error) throw new Error(playersResult.error.message);
  const players = (playersResult.data ?? []) as Player[];

  const current = seasonOf(new Date());

  return seasonsWithSessions(sessions).map((season) => {
    const inSeason = sessions.filter((s) => isSameSeason(seasonOf(s.played_at), season));
    const standings = computeStandings(inSeason, players);
    return {
      season,
      label: seasonLabel(season),
      standings,
      champion: championOf(standings),
      isCurrent: isSameSeason(season, current),
      sessionCount: inSeason.length,
    };
  });
}

// ─── Onderling duel ───────────────────────────────────────────────────────────

export type HeadToHeadResponse = {
  playerA: Player;
  playerB: Player;
  stats: HeadToHead;
};

/**
 * De onderlinge stand tussen twee spelers in een periode.
 *
 * Eén batch queries, daarna alles in memory via lib/duel.ts — hetzelfde patroon als
 * getStats. Met een paar honderd potjes is dat ruim snel genoeg.
 */
export async function getHeadToHead(
  playerAId: string,
  playerBId: string,
  period: PeriodFilter = "all"
): Promise<HeadToHeadResponse | null> {
  const supabase = createServerClient();
  const dateRange = getPeriodDateRange(period);

  let sessionQuery = supabase
    .from("game_sessions")
    .select("id, played_at, winner_id, game:games(id, name, emoji, lowest_score_wins)")
    .order("played_at", { ascending: false });

  if (dateRange) {
    sessionQuery = sessionQuery
      .gte("played_at", dateRange.from)
      .lte("played_at", dateRange.to);
  }

  const [sessionsResult, playersResult] = await Promise.all([
    sessionQuery,
    supabase.from("players").select("*").in("id", [playerAId, playerBId]),
  ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const players = (playersResult.data ?? []) as Player[];
  const playerA = players.find((p) => p.id === playerAId);
  const playerB = players.find((p) => p.id === playerBId);
  if (!playerA || !playerB) return null;

  const rawSessions = (sessionsResult.data ?? []) as unknown as Array<{
    id: string;
    played_at: string;
    winner_id: string | null;
    game: { id: string; name: string; emoji: string; lowest_score_wins: boolean | null };
  }>;

  const sessionIds = rawSessions.map((s) => s.id);
  const scoresBySession = new Map<
    string,
    Array<{ player_id: string; score: number | null }>
  >();

  if (sessionIds.length > 0) {
    // Alleen de rijen van deze twee spelers: meer hebben we niet nodig om paarsgewijs
    // te vergelijken, en het scheelt data.
    const { data: spData, error: spError } = await supabase
      .from("session_players")
      .select("session_id, player_id, score")
      .in("session_id", sessionIds)
      .in("player_id", [playerAId, playerBId]);

    if (spError) throw new Error(spError.message);

    for (const sp of (spData ?? []) as Array<{
      session_id: string;
      player_id: string;
      score: number | null;
    }>) {
      const arr = scoresBySession.get(sp.session_id) ?? [];
      arr.push({ player_id: sp.player_id, score: sp.score });
      scoresBySession.set(sp.session_id, arr);
    }
  }

  const duelSessions: DuelSession[] = rawSessions.map((s) => ({
    id: s.id,
    played_at: s.played_at,
    winner_id: s.winner_id,
    game: {
      id: s.game.id,
      name: s.game.name,
      emoji: s.game.emoji,
      lowest_score_wins: s.game.lowest_score_wins ?? false,
    },
    scores: scoresBySession.get(s.id) ?? [],
  }));

  return {
    playerA,
    playerB,
    stats: computeHeadToHead(duelSessions, playerAId, playerBId),
  };
}

// ─── Spotlight (de wisselende kaart op de homepage) ───────────────────────────

/** Sessie met deelnemers, winnaar én speelduur — precies wat lib/spotlight.ts nodig heeft. */
const SPOTLIGHT_SESSION_SELECT =
  "id, played_at, winner_id, notes, duration_minutes, game:games(id, name, emoji, lowest_score_wins), winner:players!winner_id(id, name, emoji), scores:session_players(player:players(id, name, emoji), score)";

type RawSpotlightSession = {
  id: string;
  played_at: string;
  winner_id: string | null;
  notes: string | null;
  duration_minutes: number | null;
  game: { id: string; name: string; emoji: string; lowest_score_wins: boolean | null };
  winner: SpotlightPlayer | null;
  scores: Array<{ player: SpotlightPlayer; score: number | null }>;
};

function toSpotlightSession(row: RawSpotlightSession): SpotlightSession {
  return {
    id: row.id,
    played_at: row.played_at,
    winner_id: row.winner_id,
    winner: row.winner,
    notes: row.notes,
    duration_minutes: row.duration_minutes,
    game: {
      id: row.game.id,
      name: row.game.name,
      emoji: row.game.emoji,
      lowest_score_wins: row.game.lowest_score_wins ?? false,
    },
    scores: row.scores,
  };
}

/**
 * De kaarten voor de homepage.
 *
 * Één volledige sessie-fetch, net als /history doet, en daarna rekent lib/spotlight.ts alles
 * uit — dat houdt de logica testbaar en de queries dom. Wordt de historie ooit zo lang dat
 * dit merkbaar wordt, dan is de uitweg om per kaartsoort een eigen venster-query te doen.
 *
 * `reference` bestaat om dit testbaar en handmatig controleerbaar te maken op een dag waarvan
 * je weet dat er data is. De server draait in UTC en het huishouden in Europe/Amsterdam; met
 * een venster van ±MEMORY_WINDOW_DAYS dagen maakt dat niets uit.
 */
export type SpotlightPayload = {
  /** De hele pool; de client kiest, want alleen die kent de voorkeuren en de bezetting. */
  cards: SpotlightCard[];
  /** Schuift per uur op, zodat de mix varieert zonder dat de server state bijhoudt. */
  seed: number;
};

export async function getSpotlight(reference?: Date): Promise<SpotlightPayload> {
  const supabase = createServerClient();
  const today = reference ?? new Date();

  const [sessionsResult, gamesResult, playersResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select(SPOTLIGHT_SESSION_SELECT)
      .order("played_at", { ascending: false }),
    supabase
      // min/max spelers erbij: de "staat al even stil"-kaart mag geen spel tippen dat met de
      // huidige bezetting niet te spelen is.
      .from("games")
      .select("id, name, emoji, lowest_score_wins, min_players, max_players")
      .eq("is_archived", false)
      .order("name"),
    supabase.from("players").select("id, name, emoji").eq("is_active", true),
  ]);

  if (sessionsResult.error)
    throw new Error(`Failed to fetch spotlight: ${sessionsResult.error.message}`);
  if (gamesResult.error) throw new Error(gamesResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const sessions = ((sessionsResult.data ?? []) as unknown as RawSpotlightSession[]).map(
    toSpotlightSession
  );
  const games = ((gamesResult.data ?? []) as unknown as Array<{
    id: string;
    name: string;
    emoji: string;
    lowest_score_wins: boolean | null;
    min_players: number | null;
    max_players: number | null;
  }>).map((game) => ({
    ...game,
    lowest_score_wins: game.lowest_score_wins ?? false,
    min_players: game.min_players ?? undefined,
    max_players: game.max_players ?? undefined,
  }));
  const players = (playersResult.data ?? []) as unknown as SpotlightPlayer[];

  return {
    cards: buildSpotlightCards({ sessions, games, players, today }),
    // De seed schuift per uur op: binnen een sessie blijft de mix staan, maar wie de app
    // morgen weer opent ziet andere kaarten.
    seed: Math.floor(today.getTime() / 3_600_000),
  };
}

export type MemoryToday = {
  /** Hoeveel jaar geleden, van de dichtstbijzijnde treffer. */
  yearsAgo: number;
  /** Hoeveel potjes er op precies deze dag gespeeld zijn. */
  count: number;
};

/**
 * Is er een terugblik van precies vandaag?
 *
 * Bewust los van getSpotlight(): dit wordt vanuit de navigatiebalk op elke pagina opgevraagd en
 * mag niet de hele historie ophalen. Drie kleine dagvensters (1, 2 en 3 jaar terug) volstaan.
 * Precies dezelfde kalenderdag, niet het ±3-daagse venster van de kaart zelf — een stip die
 * een week blijft staan is geen nieuws meer.
 */
export async function getMemoryToday(reference?: Date): Promise<MemoryToday | null> {
  const supabase = createServerClient();
  const base = reference ?? new Date();

  const years = Array.from({ length: MEMORY_MAX_YEARS_BACK }, (_, index) => index + 1);

  const results = await Promise.all(
    years.map((yearsAgo) => {
      const target = new Date(base);
      target.setFullYear(target.getFullYear() - yearsAgo);

      const from = new Date(target);
      from.setHours(0, 0, 0, 0);
      const to = new Date(target);
      to.setHours(23, 59, 59, 999);

      return supabase
        .from("game_sessions")
        .select("id")
        .gte("played_at", from.toISOString())
        .lte("played_at", to.toISOString());
    })
  );

  for (const [index, result] of results.entries()) {
    if (result.error) throw new Error(result.error.message);
    const count = (result.data ?? []).length;
    if (count > 0) return { yearsAgo: (years[index] as number), count };
  }

  return null;
}

/**
 * Alles wat de kaart bij een gekozen spel laat zien: de laatste uitslagen, de stand voor dit
 * spel, het record en de gemiddelde speelduur. Null als het spel niet bestaat.
 */
export async function getGameRecap(gameId: string): Promise<GameRecap | null> {
  const supabase = createServerClient();

  const [gameResult, sessionsResult, playersResult] = await Promise.all([
    supabase
      .from("games")
      .select("id, name, emoji, lowest_score_wins")
      .eq("id", gameId)
      .single(),
    supabase
      .from("game_sessions")
      .select(SPOTLIGHT_SESSION_SELECT)
      .eq("game_id", gameId)
      .order("played_at", { ascending: false }),
    supabase.from("players").select("id, name, emoji").eq("is_active", true),
  ]);

  if (gameResult.error || !gameResult.data) return null;
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const raw = gameResult.data as unknown as {
    id: string;
    name: string;
    emoji: string;
    lowest_score_wins: boolean | null;
  };
  const game: SpotlightGame = {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    lowest_score_wins: raw.lowest_score_wins ?? false,
  };

  const sessions = ((sessionsResult.data ?? []) as unknown as RawSpotlightSession[]).map(
    toSpotlightSession
  );
  const players = (playersResult.data ?? []) as unknown as SpotlightPlayer[];

  return computeGameRecap(sessions, game, players);
}

/** Eén ronde van een sessie, zoals /history hem toont. */
export type SessionRoundDetail = {
  round_number: number;
  player_id: string;
  score: number | null;
};

/**
 * De rondes van één sessie, oplopend genummerd.
 *
 * Bewust een aparte query en geen embed in getAllSessions: dát antwoord gaat over alle
 * sessies en wordt gecachet, en een paar honderd potjes met tien rondes zou daar een
 * veelvoud aan rijen in duwen die je bijna nooit uitklapt.
 */
export async function getSessionRounds(sessionId: string): Promise<SessionRoundDetail[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("session_rounds")
    .select("round_number, player_id, score")
    .eq("session_id", sessionId)
    .order("round_number");
  if (error) throw new Error(`Failed to fetch rounds: ${error.message}`);
  return (data ?? []) as SessionRoundDetail[];
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

  // Update scores if provided.
  //
  // Let op: dit vervangt de deelnemers, het vult ze niet aan. De payload moet dus ALTIJD
  // de volledige deelnemersset bevatten, inclusief spelers zonder score (score: null).
  // Wie ontbreekt, is straks geen deelnemer meer en verdwijnt uit alle statistieken.
  if (input.scores !== undefined) {
    if (input.scores.length === 0) {
      throw new Error(
        "Een sessie zonder deelnemers bestaat niet — stuur de volledige deelnemersset mee."
      );
    }

    // Alleen herschrijven als er echt iets verandert. /history stuurt bij ELKE opslag de
    // volledige deelnemersset mee, ook als je alleen de notitie aanpaste; zonder deze
    // check zou dat de rondes weggooien en de session_players-id's vernieuwen.
    const { data: current } = await supabase
      .from("session_players")
      .select("player_id, score")
      .eq("session_id", id);

    const unchanged = sameParticipantScores(
      (current ?? []) as Array<{ player_id: string; score: number | null }>,
      input.scores
    );

    if (!unchanged) {
      // Delete existing scores and re-insert
      const { error: deleteError } = await supabase
        .from("session_players")
        .delete()
        .eq("session_id", id);
      if (deleteError) throw new Error(`Failed to delete scores: ${deleteError.message}`);

      const { error: insertError } = await supabase
        .from("session_players")
        .insert(input.scores.map((s) => ({ session_id: id, player_id: s.player_id, score: s.score ?? null })));
      if (insertError) throw new Error(`Failed to insert scores: ${insertError.message}`);

      // De rondes horen bij de totalen. Wordt een totaal met de hand gecorrigeerd, dan
      // tellen de opgeslagen rondes niet meer op tot het getal erboven. Liever weg dan
      // een rondetabel die iets anders beweert.
      const { error: roundsError } = await supabase
        .from("session_rounds")
        .delete()
        .eq("session_id", id);
      if (roundsError) throw new Error(`Failed to delete rounds: ${roundsError.message}`);
    }
  }
}

/** Delete a session (and its session_players via cascade) */
export async function deleteSession(id: string): Promise<void> {
  const supabase = createServerClient();
  // Delete session_players first (in case no cascade)
  await supabase.from("session_players").delete().eq("session_id", id);
  await supabase.from("session_rounds").delete().eq("session_id", id);
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
    // Gasten blijven hier buiten, net als in het hoofd-leaderboard: een gast met
    // één toevallige zaterdagwinst hoort geen eigen regel in de weekdag-chart.
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .eq("is_guest", false),
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
    const winnerId = session.winner_id as string | null;
    const dayStat = stats[day];
    if (!dayStat) continue;
    // Een gelijkspel is een gespeelde avond, maar levert niemand een win op. Zonder deze
    // guard belandde het onder de letterlijke sleutel "null".
    dayStat.sessions++;
    if (!winnerId) continue;
    dayStat.winsByPlayer[winnerId] = (dayStat.winsByPlayer[winnerId] ?? 0) + 1;
  }

  return { stats, players };
}

/** Alle data die de badge-berekening nodig heeft, in één keer opgehaald */
async function loadAchievementData(): Promise<{
  sessions: AchievementSession[];
  players: Player[];
  ctx: AchievementContext;
}> {
  const supabase = createServerClient();

  const [sessionsResult, sessionPlayersResult, playersResult, gamesResult] =
    await Promise.all([
      supabase
        .from("game_sessions")
        .select(
          "id, played_at, game_id, winner_id, starter_id, marathon_id, duration_minutes"
        )
        .order("played_at", { ascending: true }),
      supabase.from("session_players").select("session_id, player_id, score"),
      supabase.from("players").select("*"),
      supabase.from("games").select("id, category, difficulty, lowest_score_wins"),
    ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (sessionPlayersResult.error) throw new Error(sessionPlayersResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);
  if (gamesResult.error) throw new Error(gamesResult.error.message);

  const rawSessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    played_at: string;
    game_id: string;
    winner_id: string | null;
    starter_id: string | null;
    marathon_id: string | null;
    duration_minutes: number | null;
  }>;
  const sessionPlayers = (sessionPlayersResult.data ?? []) as Array<{
    session_id: string;
    player_id: string;
    score: number | null;
  }>;
  const allPlayers = (playersResult.data ?? []) as Player[];
  const games = (gamesResult.data ?? []) as Array<{
    id: string;
    category: string | null;
    difficulty: number | null;
    lowest_score_wins: boolean | null;
  }>;

  const gameMap = new Map(games.map((g) => [g.id, g]));

  // Build maps session_id → player IDs / scores
  const sessionPlayerMap = new Map<string, string[]>();
  const sessionScoreMap = new Map<string, Record<string, number | null>>();
  for (const sp of sessionPlayers) {
    const arr = sessionPlayerMap.get(sp.session_id) ?? [];
    arr.push(sp.player_id);
    sessionPlayerMap.set(sp.session_id, arr);
    const scores = sessionScoreMap.get(sp.session_id) ?? {};
    scores[sp.player_id] = sp.score;
    sessionScoreMap.set(sp.session_id, scores);
  }

  const activePlayers = allPlayers.filter((p) => p.is_active);

  // Build AchievementSession objects.
  //
  // Er is hier bewust geen fallback voor sessies zonder session_players-rijen. Die
  // fallback ("neem aan dat de vaste spelers meededen") liet het toevoegen van een
  // nieuwe vaste speler retroactief de badges van iedereen veranderen, omdat die speler
  // dan aan elke rijloze historische sessie werd toegevoegd. Migratie 009 vult de
  // ontbrekende rijen eenmalig aan; daarna is de deelname een feit in de database.
  const sessions: AchievementSession[] = rawSessions.map((s) => {
    const game = gameMap.get(s.game_id);
    return {
      id: s.id,
      played_at: s.played_at,
      game_id: s.game_id,
      winner_id: s.winner_id,
      starter_id: s.starter_id,
      marathon_id: s.marathon_id,
      duration_minutes: s.duration_minutes,
      game_category: game?.category ?? null,
      game_difficulty: game?.difficulty ?? null,
      lowest_score_wins: game?.lowest_score_wins ?? false,
      players: sessionPlayerMap.get(s.id) ?? [],
      scores: sessionScoreMap.get(s.id) ?? {},
    };
  });

  return {
    sessions,
    players: activePlayers,
    ctx: {
      guestPlayerIds: allPlayers.filter((p) => p.is_guest).map((p) => p.id),
    },
  };
}

/** Get achievements for all active players */
export async function getPlayerAchievements(): Promise<PlayerAchievements[]> {
  const { sessions, players, ctx } = await loadAchievementData();

  return players.map((player) => {
    const achievements = calculateAchievements(sessions, player.id, ctx);
    return {
      player,
      achievements,
      earnedCount: achievements.filter((a) => a.earnedAt !== null).length,
    };
  });
}

/** Badges die de speler precies in deze sessie heeft ontgrendeld */
async function getBadgesUnlockedInSession(
  playerId: string,
  playedAt: string
): Promise<Achievement[]> {
  const { sessions, ctx } = await loadAchievementData();
  return calculateAchievements(sessions, playerId, ctx).filter(
    (a) => a.earnedAt === playedAt
  );
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
    // Alle spelers, inclusief gasten: die krijgen hun eigen blok onder het
    // hoofd-leaderboard (zie guest_leaderboard hieronder).
    supabase.from("players").select("*").eq("is_active", true),
  ]);

  if (sessionsResult.error)
    throw new Error(`Failed to fetch sessions: ${sessionsResult.error.message}`);
  if (playersResult.error)
    throw new Error(`Failed to fetch players: ${playersResult.error.message}`);

  const allSessions = sessionsResult.data ?? [];
  const allPlayers = (playersResult.data ?? []) as Player[];

  // Fetch session_players eerst: wie meedeed bepaalt het leaderboard, en dezelfde data
  // levert verderop de scores voor de highlights. Dit hoeft dus geen extra query te zijn.
  const sessionIds = allSessions.map((s) => s.id as string);
  const scoresBySession = new Map<
    string,
    Array<{ player: Player; score: number | null }>
  >();

  if (sessionIds.length > 0) {
    const { data: spData, error: spError } = await supabase
      .from("session_players")
      .select("session_id, score, player:players(*)")
      .in("session_id", sessionIds);

    if (spError)
      throw new Error(`Failed to fetch session players: ${spError.message}`);

    for (const sp of spData ?? []) {
      const sessionId = sp.session_id as string;
      const arr = scoresBySession.get(sessionId) ?? [];
      arr.push({
        player: sp.player as unknown as Player,
        score: sp.score as number | null,
      });
      scoresBySession.set(sessionId, arr);
    }
  }

  // Sessies in de vorm die lib/stats.ts verwacht — nieuwste eerst, met de werkelijke
  // deelnemers per potje.
  const statSessions: StatSession[] = allSessions.map((s) => ({
    id: s.id as string,
    played_at: s.played_at as string,
    winner_id: s.winner_id as string | null,
    player_ids: (scoresBySession.get(s.id as string) ?? []).map(
      (entry) => entry.player.id
    ),
  }));

  const leaderboard = computeLeaderboard(
    statSessions,
    allPlayers.filter((p) => !p.is_guest)
  );

  // Gasten staan apart: /guests belooft expliciet dat ze niet in het hoofd-leaderboard
  // meetellen, en een gast met één gewonnen potje zou daar bovenaan belanden. Alleen
  // gasten die in deze periode daadwerkelijk speelden.
  const guest_leaderboard = computeLeaderboard(
    statSessions,
    allPlayers.filter((p) => p.is_guest)
  ).filter((entry) => entry.total_games > 0);

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

  // Compute score highlights
  let highestScore: { score: number; player: Player; game: Game } | null = null;
  const playerScoreSum = new Map<
    string,
    { player: Player; sum: number; count: number }
  >();
  let biggestDiff: { diff: number; played_at: string; game: Game } | null = null;

  for (const session of allSessions) {
    const scores = scoresBySession.get(session.id as string) ?? [];

    for (const { player, score } of scores) {
      if (score === null) continue;
      if (!highestScore || score > highestScore.score) {
        highestScore = { score, player, game: session.game as Game };
      }
      const existing = playerScoreSum.get(player.id);
      if (existing) {
        existing.sum += score;
        existing.count++;
      } else {
        playerScoreSum.set(player.id, { player, sum: score, count: 1 });
      }
    }

    const validScores = scores
      .filter((s) => s.score !== null)
      .map((s) => s.score as number);
    if (validScores.length >= 2) {
      const diff = Math.max(...validScores) - Math.min(...validScores);
      if (!biggestDiff || diff > biggestDiff.diff) {
        biggestDiff = {
          diff,
          played_at: session.played_at as string,
          game: session.game as Game,
        };
      }
    }
  }

  const avg_scores = Array.from(playerScoreSum.values())
    .map(({ player, sum, count }) => ({
      player,
      avg: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => b.avg - a.avg);

  const score_highlights = {
    highest_score: highestScore,
    avg_scores,
    biggest_diff: biggestDiff,
  };

  // Build score trend: last 20 sessions with at least one score, oldest-first
  const sessionsWithScores = allSessions
    .filter((s) =>
      (scoresBySession.get(s.id as string) ?? []).some(
        (sp) => sp.score !== null
      )
    )
    .slice(0, 20)
    .reverse();

  const score_trend = sessionsWithScores.map((s) => ({
    played_at: s.played_at as string,
    scores: scoresBySession.get(s.id as string) ?? [],
  }));

  // Include scores in recent_sessions
  const recent_sessions = allSessions.slice(0, 10).map((s) => ({
    ...s,
    scores: scoresBySession.get(s.id as string) ?? [],
  })) as StatsResponse["recent_sessions"];

  return {
    leaderboard,
    guest_leaderboard,
    top_games,
    recent_sessions,
    score_highlights,
    score_trend,
  };
}

// ─── Score statistics ─────────────────────────────────────────────────────────

export type ScoreStatsResponse = {
  has_scores: boolean;
  hall_of_fame: Array<{
    player: { id: string; name: string; emoji: string };
    game: { id: string; name: string; emoji: string };
    score: number;
    played_at: string;
  }>;
  avg_scores: Array<{
    player: { id: string; name: string; emoji: string };
    avg_score: number;
    session_count: number;
    max_score: number;
  }>;
  score_trend: Array<{
    played_at: string;
    session_id: string;
    scores: Array<{ player_id: string; name: string; emoji: string; score: number }>;
  }>;
  biggest_margin: {
    game: { id: string; name: string; emoji: string };
    played_at: string;
    margin: number;
    winner_name: string;
    winner_emoji: string;
    scores: Array<{ name: string; emoji: string; score: number }>;
  } | null;
};

/** Score-statistieken: Hall of Fame, gemiddelden, verloop en grootste marge */
export async function getScoreStats(
  period: PeriodFilter,
  gameId?: string | null
): Promise<ScoreStatsResponse> {
  const supabase = createServerClient();
  const dateRange = getPeriodDateRange(period);

  let sessionQuery = supabase
    .from("game_sessions")
    .select("id, played_at, winner_id, game:games(id,name,emoji), winner:players!winner_id(id,name,emoji)")
    .order("played_at", { ascending: false });

  if (dateRange) {
    sessionQuery = sessionQuery.gte("played_at", dateRange.from).lte("played_at", dateRange.to);
  }
  if (gameId) {
    sessionQuery = sessionQuery.eq("game_id", gameId);
  }

  const { data: sessions, error: sErr } = await sessionQuery;
  if (sErr) throw new Error(sErr.message);

  const allSessions = sessions ?? [];
  if (allSessions.length === 0) {
    return { has_scores: false, hall_of_fame: [], avg_scores: [], score_trend: [], biggest_margin: null };
  }

  const sessionIds = allSessions.map((s) => s.id);
  const { data: spData, error: spErr } = await supabase
    .from("session_players")
    .select("session_id, player_id, score, player:players(id,name,emoji)")
    .in("session_id", sessionIds)
    .not("score", "is", null);

  if (spErr) throw new Error(spErr.message);

  type RawSP = { session_id: string; player_id: string; score: number; player: { id: string; name: string; emoji: string } };
  const scoredEntries = (spData ?? []) as unknown as RawSP[];

  if (scoredEntries.length === 0) {
    return { has_scores: false, hall_of_fame: [], avg_scores: [], score_trend: [], biggest_margin: null };
  }

  type SessionInfo = { id: string; played_at: string; game: { id: string; name: string; emoji: string }; winner: { id: string; name: string; emoji: string } | null };
  const sessionMap = new Map<string, SessionInfo>(allSessions.map((s) => [s.id, s as unknown as SessionInfo]));

  // === Hall of Fame ===
  let hallOfFame: ScoreStatsResponse["hall_of_fame"] = [];
  if (gameId) {
    // Per player: their personal best for this game
    const perPlayer = new Map<string, { score: number; player: RawSP["player"]; session: SessionInfo }>();
    for (const sp of scoredEntries) {
      const session = sessionMap.get(sp.session_id);
      if (!session) continue;
      const existing = perPlayer.get(sp.player_id);
      if (!existing || sp.score > existing.score) {
        perPlayer.set(sp.player_id, { score: sp.score, player: sp.player, session });
      }
    }
    hallOfFame = Array.from(perPlayer.values())
      .sort((a, b) => b.score - a.score)
      .map(({ player, score, session }) => ({ player, game: session.game, score, played_at: session.played_at }));
  } else {
    // Overall top 5 records across all games
    hallOfFame = [...scoredEntries]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((sp) => {
        const session = sessionMap.get(sp.session_id)!;
        return { player: sp.player, game: session.game, score: sp.score, played_at: session.played_at };
      });
  }

  // === Avg scores ===
  const playerAggMap = new Map<string, { player: RawSP["player"]; scores: number[] }>();
  for (const sp of scoredEntries) {
    const existing = playerAggMap.get(sp.player_id);
    if (existing) {
      existing.scores.push(sp.score);
    } else {
      playerAggMap.set(sp.player_id, { player: sp.player, scores: [sp.score] });
    }
  }
  const avgScores = Array.from(playerAggMap.values())
    .map(({ player, scores }) => ({
      player,
      avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      session_count: scores.length,
      max_score: Math.max(...scores),
    }))
    .sort((a, b) => b.avg_score - a.avg_score);

  // === Score trend ===
  const sessionScoreMap = new Map<string, { played_at: string; scores: Array<{ player_id: string; name: string; emoji: string; score: number }> }>();
  for (const sp of scoredEntries) {
    const session = sessionMap.get(sp.session_id);
    if (!session) continue;
    const entry = { player_id: sp.player_id, name: sp.player.name, emoji: sp.player.emoji, score: sp.score };
    const existing = sessionScoreMap.get(sp.session_id);
    if (existing) {
      existing.scores.push(entry);
    } else {
      sessionScoreMap.set(sp.session_id, { played_at: session.played_at, scores: [entry] });
    }
  }

  const scoreTrend = allSessions
    .filter((s) => sessionScoreMap.has(s.id))
    .map((s) => ({ played_at: s.played_at, session_id: s.id, scores: sessionScoreMap.get(s.id)!.scores }))
    .reverse();

  // === Biggest margin ===
  let biggestMargin: ScoreStatsResponse["biggest_margin"] = null;
  let maxMargin = 0;

  for (const [sessionId, { played_at, scores }] of sessionScoreMap) {
    if (scores.length < 2) continue;
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const margin = (sorted[0]?.score ?? 0) - (sorted[sorted.length - 1]?.score ?? 0);
    if (margin > maxMargin) {
      maxMargin = margin;
      const session = sessionMap.get(sessionId)!;
      const winner = session.winner;
      biggestMargin = {
        game: session.game,
        played_at,
        margin,
        winner_name: winner?.name ?? sorted[0]?.name ?? "",
        winner_emoji: winner?.emoji ?? sorted[0]?.emoji ?? "",
        scores: sorted,
      };
    }
  }

  return { has_scores: true, hall_of_fame: hallOfFame, avg_scores: avgScores, score_trend: scoreTrend, biggest_margin: biggestMargin };
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

// ─── Pre-game hype & post-game highlights ────────────────────────────────────

type PlayerLite = { id: string; name: string; emoji: string };

/** Pre-game hype facts: streak, laatste h2h, starter-voordeel, spel-koning.
 *  Max 3 feitjes, geprioriteerd op emotionele impact (streak → h2h → starter → king). */
export async function getPreGameHype(params: {
  gameId: string;
  playerIds: string[];
  starterId?: string | null;
}): Promise<{ facts: HypeFact[] }> {
  const { gameId, playerIds, starterId } = params;
  if (!gameId || playerIds.length === 0) return { facts: [] };

  const supabase = createServerClient();
  const allPlayerIds = Array.from(
    new Set([...playerIds, ...(starterId ? [starterId] : [])])
  );

  const [gameResult, sessionsResult, playersResult] = await Promise.all([
    supabase
      .from("games")
      .select("id, name, emoji")
      .eq("id", gameId)
      .single(),
    supabase
      .from("game_sessions")
      .select("id, played_at, winner_id, starter_id")
      .eq("game_id", gameId)
      .order("played_at", { ascending: false }),
    supabase
      .from("players")
      .select("id, name, emoji")
      .in("id", allPlayerIds),
  ]);

  if (gameResult.error || !gameResult.data) return { facts: [] };
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (playersResult.error) throw new Error(playersResult.error.message);

  const game = gameResult.data as { id: string; name: string; emoji: string };
  const sessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    played_at: string;
    winner_id: string | null;
    starter_id: string | null;
  }>;
  const playerMap = new Map<string, PlayerLite>();
  for (const p of (playersResult.data ?? []) as PlayerLite[]) {
    playerMap.set(p.id, p);
  }

  // Fetch session_players for h2h lookup (only if 2-player scenario)
  const sessionPlayers = new Map<
    string,
    Array<{ player_id: string; score: number | null }>
  >();
  if (playerIds.length === 2 && sessions.length > 0) {
    const { data: spData } = await supabase
      .from("session_players")
      .select("session_id, player_id, score")
      .in(
        "session_id",
        sessions.map((s) => s.id)
      );
    for (const sp of (spData ?? []) as Array<{
      session_id: string;
      player_id: string;
      score: number | null;
    }>) {
      const arr = sessionPlayers.get(sp.session_id) ?? [];
      arr.push({ player_id: sp.player_id, score: sp.score });
      sessionPlayers.set(sp.session_id, arr);
    }
  }

  const facts: HypeFact[] = [];

  // 1. Current streak per selected player for this game
  let topStreakPlayerId: string | null = null;
  let topStreak = 0;
  for (const pid of playerIds) {
    let streak = 0;
    for (const s of sessions) {
      if (s.winner_id === pid) streak++;
      else break;
    }
    if (streak >= 2 && streak > topStreak) {
      topStreak = streak;
      topStreakPlayerId = pid;
    }
  }
  if (topStreakPlayerId) {
    const p = playerMap.get(topStreakPlayerId);
    if (p) {
      facts.push({
        icon: "🔥",
        text: `${p.emoji} ${p.name} staat op ${topStreak}-streak bij ${game.name}`,
        tone: "coral",
      });
    }
  }

  // 2. Head-to-head laatste ontmoeting (exactly 2 selected players)
  if (playerIds.length === 2 && facts.length < 3) {
    const a = playerIds[0]!;
    const b = playerIds[1]!;
    for (const s of sessions) {
      const sp = sessionPlayers.get(s.id);
      if (!sp) continue;
      const hasA = sp.some((x) => x.player_id === a);
      const hasB = sp.some((x) => x.player_id === b);
      if (!hasA || !hasB) continue;
      if (s.winner_id === a || s.winner_id === b) {
        const winnerId = s.winner_id;
        const loserId = winnerId === a ? b : a;
        const winner = winnerId ? playerMap.get(winnerId) : null;
        const wScore = sp.find((x) => x.player_id === winnerId)?.score ?? null;
        const lScore = sp.find((x) => x.player_id === loserId)?.score ?? null;
        if (winner) {
          const diffText =
            wScore !== null && lScore !== null
              ? ` met ${Math.abs(wScore - lScore)} punten`
              : "";
          facts.push({
            icon: "⚔️",
            text: `Vorig potje won ${winner.emoji} ${winner.name}${diffText}`,
            tone: "lavender",
          });
        }
      }
      break; // only most recent shared session
    }
  }

  // 3. Starter-voordeel
  if (starterId && facts.length < 3) {
    const withStarter = sessions.filter((s) => s.starter_id !== null);
    if (withStarter.length >= 5) {
      const starterWins = withStarter.filter(
        (s) => s.winner_id === s.starter_id
      ).length;
      const pct = Math.round((starterWins / withStarter.length) * 100);
      const starter = playerMap.get(starterId);
      if (starter) {
        if (pct >= 60) {
          facts.push({
            icon: "🎲",
            text: `${starter.emoji} ${starter.name} begint — starters winnen hier ${pct}% van de tijd`,
            tone: "mint",
          });
        } else if (pct <= 35) {
          facts.push({
            icon: "🎲",
            text: `${starter.emoji} ${starter.name} begint — maar starters winnen hier maar ${pct}%…`,
            tone: "mint",
          });
        }
      }
    }
  }

  // 4. Spel-koning onder de geselecteerde spelers
  if (facts.length < 3 && sessions.length >= 3) {
    const winsBySelected = new Map<string, number>();
    let selectedWinnerTotal = 0;
    for (const s of sessions) {
      if (s.winner_id && playerIds.includes(s.winner_id)) {
        winsBySelected.set(
          s.winner_id,
          (winsBySelected.get(s.winner_id) ?? 0) + 1
        );
        selectedWinnerTotal++;
      }
    }
    let kingId: string | null = null;
    let kingWins = 0;
    for (const [pid, w] of winsBySelected) {
      if (w > kingWins) {
        kingWins = w;
        kingId = pid;
      }
    }
    if (
      kingId &&
      kingWins >= 3 &&
      selectedWinnerTotal > 0 &&
      kingWins / selectedWinnerTotal >= 0.6 &&
      kingId !== topStreakPlayerId // avoid duplicate mention with streak fact
    ) {
      const king = playerMap.get(kingId);
      if (king) {
        facts.push({
          icon: "👑",
          text: `${king.emoji} ${king.name} is koning van ${game.name} (${kingWins} wins)`,
          tone: "yellow",
        });
      }
    }
  }

  return { facts: facts.slice(0, 3) };
}

/** Post-session highlights voor de winnaar: mijlpaal, streak, persoonlijk record, h2h,
 *  plus de badges die deze sessie zijn ontgrendeld. */
export async function getSessionHighlights(
  sessionId: string
): Promise<{ highlights: HypeFact[]; newBadges: SessionBadge[] }> {
  const supabase = createServerClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("game_sessions")
    .select(
      "id, game_id, winner_id, played_at, game:games(id,name,emoji), winner:players!winner_id(id,name,emoji)"
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) return { highlights: [], newBadges: [] };
  const typedSession = sessionData as unknown as {
    game: PlayerLite;
    game_id: string;
    winner_id: string | null;
    played_at: string;
    winner: PlayerLite | null;
  };
  const winner = typedSession.winner;
  if (!winner) return { highlights: [], newBadges: [] };
  const game = typedSession.game;
  const gameId = typedSession.game_id;
  const playedAt = typedSession.played_at;

  const [gameSessionsResult, recentResult, currentSPResult] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("id, winner_id, played_at")
      .eq("game_id", gameId)
      .order("played_at", { ascending: false }),
    supabase
      .from("game_sessions")
      .select("winner_id, played_at")
      .order("played_at", { ascending: false })
      .limit(50),
    supabase
      .from("session_players")
      .select("player_id, score")
      .eq("session_id", sessionId),
  ]);

  if (gameSessionsResult.error) throw new Error(gameSessionsResult.error.message);
  if (recentResult.error) throw new Error(recentResult.error.message);
  if (currentSPResult.error) throw new Error(currentSPResult.error.message);

  const gameSessions = (gameSessionsResult.data ?? []) as Array<{
    id: string;
    winner_id: string | null;
    played_at: string;
  }>;
  const recent = (recentResult.data ?? []) as Array<{
    winner_id: string | null;
    played_at: string;
  }>;
  const currentSP = (currentSPResult.data ?? []) as Array<{
    player_id: string;
    score: number | null;
  }>;

  const winnerScore =
    currentSP.find((sp) => sp.player_id === winner.id)?.score ?? null;
  const otherPlayerIds = currentSP
    .filter((sp) => sp.player_id !== winner.id)
    .map((sp) => sp.player_id);

  const totalWinsAtGame = gameSessions.filter(
    (s) => s.winner_id === winner.id
  ).length;

  // Current streak across all games
  let currentStreak = 0;
  for (const s of recent) {
    if (s.winner_id === winner.id) currentStreak++;
    else break;
  }

  // Personal record check — needs ≥2 prior scores to be meaningful
  let isPersonalRecord = false;
  if (winnerScore !== null) {
    const priorSessionIds = gameSessions
      .filter((s) => s.id !== sessionId)
      .map((s) => s.id);
    if (priorSessionIds.length > 0) {
      const { data: priorSP } = await supabase
        .from("session_players")
        .select("score")
        .eq("player_id", winner.id)
        .in("session_id", priorSessionIds)
        .not("score", "is", null);
      const priorScores = ((priorSP ?? []) as Array<{ score: number | null }>)
        .map((sp) => sp.score)
        .filter((s): s is number => s !== null);
      if (priorScores.length >= 2) {
        isPersonalRecord = winnerScore > Math.max(...priorScores);
      }
    }
  }

  // H2H year-to-date (only if exactly 1 other player in this session)
  let h2h: {
    myWins: number;
    theirWins: number;
    otherName: string;
    otherEmoji: string;
  } | null = null;
  if (otherPlayerIds.length === 1) {
    const otherId = otherPlayerIds[0]!;
    const yearStart = new Date(
      new Date(playedAt).getFullYear(),
      0,
      1
    ).toISOString();
    const { data: yearSessions } = await supabase
      .from("game_sessions")
      .select("id, winner_id")
      .gte("played_at", yearStart);
    const sessionList = (yearSessions ?? []) as Array<{
      id: string;
      winner_id: string | null;
    }>;
    if (sessionList.length > 0) {
      const winnersById = new Map(sessionList.map((s) => [s.id, s.winner_id]));
      const { data: spInYear } = await supabase
        .from("session_players")
        .select("session_id, player_id")
        .in(
          "session_id",
          sessionList.map((s) => s.id)
        )
        .in("player_id", [winner.id, otherId]);
      const participation = new Map<string, Set<string>>();
      for (const sp of (spInYear ?? []) as Array<{
        session_id: string;
        player_id: string;
      }>) {
        const set = participation.get(sp.session_id) ?? new Set<string>();
        set.add(sp.player_id);
        participation.set(sp.session_id, set);
      }
      let myWins = 0;
      let theirWins = 0;
      for (const [sid, parts] of participation) {
        if (parts.has(winner.id) && parts.has(otherId)) {
          const w = winnersById.get(sid);
          if (w === winner.id) myWins++;
          else if (w === otherId) theirWins++;
        }
      }
      if (myWins + theirWins >= 3) {
        const { data: otherData } = await supabase
          .from("players")
          .select("name, emoji")
          .eq("id", otherId)
          .single();
        if (otherData) {
          h2h = {
            myWins,
            theirWins,
            otherName: (otherData as { name: string }).name,
            otherEmoji: (otherData as { emoji: string }).emoji,
          };
        }
      }
    }
  }

  const highlights: HypeFact[] = [];
  const milestones = new Set([1, 5, 10, 25, 50, 100]);

  if (milestones.has(totalWinsAtGame)) {
    highlights.push({
      icon: "🏆",
      text:
        totalWinsAtGame === 1
          ? `Eerste win bij ${game.name}!`
          : `${totalWinsAtGame}e win bij ${game.name}!`,
      tone: "yellow",
    });
  }

  if (currentStreak >= 2) {
    highlights.push({
      icon: "🔥",
      text: `${currentStreak}e win op rij!`,
      tone: "coral",
    });
  }

  if (isPersonalRecord && winnerScore !== null) {
    highlights.push({
      icon: "🎯",
      text: `Persoonlijk record bij ${game.name}: ${winnerScore}!`,
      tone: "mint",
    });
  }

  if (h2h && highlights.length < 3) {
    highlights.push({
      icon: "⚔️",
      text: `Nu ${h2h.myWins}-${h2h.theirWins} tegen ${h2h.otherEmoji} ${h2h.otherName} dit jaar`,
      tone: "lavender",
    });
  }

  const unlocked = await getBadgesUnlockedInSession(winner.id, playedAt);
  const newBadges: SessionBadge[] = unlocked.map((a) => ({
    id: a.id,
    emoji: a.emoji,
    name: a.name,
    description: a.description,
    tier: a.tier,
  }));

  return { highlights: highlights.slice(0, 3), newBadges };
}
