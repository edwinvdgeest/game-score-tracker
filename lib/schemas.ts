import { z } from "zod";
import { isDisplayableImageUrl } from "@/lib/game-images";

// Enums
export const gameCategorySchema = z.enum([
  "bordspel",
  "kaartspel",
  "dobbelspel",
  "woordspel",
  "overig",
]);
export type GameCategory = z.infer<typeof gameCategorySchema>;

// Database row types (returned from Supabase)
export const playerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  is_active: z.boolean(),
  is_guest: z.boolean().default(false),
  // Staat deze speler standaard aangevinkt bij een nieuw potje? Losstaand van is_active:
  // een speler die af en toe meedoet is actief maar niet standaard aangevinkt.
  include_by_default: z.boolean().default(false),
  created_at: z.string(),
});
export type Player = z.infer<typeof playerSchema>;

export const createPlayerSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(10).default("🎲"),
  is_guest: z.boolean().optional().default(false),
  include_by_default: z.boolean().optional().default(false),
});
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().min(1).max(10).optional(),
  is_active: z.boolean().optional(),
  include_by_default: z.boolean().optional(),
});
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;

export const textSourceSchema = z.enum(["seed", "bgg", "claude", "handmatig"]);
export type TextSource = z.infer<typeof textSourceSchema>;

export const gameSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  category: gameCategorySchema,
  min_players: z.number().int(),
  max_players: z.number().int(),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  created_at: z.string(),
  is_favorite: z.boolean().optional().default(false),
  is_archived: z.boolean().optional().default(false),
  lowest_score_wins: z.boolean().optional().default(false),
  // Metadata (migratie 010). Allemaal nullable: bestaande rijen hebben niets.
  bgg_id: z.number().int().nullable().optional(),
  image_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  year_published: z.number().int().nullable().optional(),
  // PostgREST geeft numeric-kolommen terug als string ("7.90"), niet als number.
  // z.coerce voorkomt dat dat ongemerkt in de UI belandt.
  bgg_rating: z.coerce.number().nullable().optional(),
  bgg_weight: z.coerce.number().nullable().optional(),
  playing_time_minutes: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  rules_summary: z.string().nullable().optional(),
  variant_note: z.string().nullable().optional(),
  parent_game_id: z.string().uuid().nullable().optional(),
  text_source: textSourceSchema.nullable().optional(),
  text_locked: z.boolean().optional().default(false),
  bgg_synced_at: z.string().nullable().optional(),
  bgg_sync_error: z.string().nullable().optional(),
});
export type Game = z.infer<typeof gameSchema>;

/** De velden van een hoofdspel die een variant kan erven. */
export type ParentGameRef = Pick<
  Game,
  "id" | "name" | "emoji" | "image_url" | "thumbnail_url" | "description" | "rules_summary"
>;

export type GameWithStats = Game & {
  totalSessions: number;
  lastPlayedAt: string | null;
  topWinner: { name: string; emoji: string; winPercentage: number } | null;
  parent?: ParentGameRef | null;
};

export const gameSessionSchema = z.object({
  id: z.string().uuid(),
  game_id: z.string().uuid(),
  played_at: z.string(),
  day_of_week: z.number().int().min(0).max(6),
  winner_id: z.string().uuid().nullable(),
  starter_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  marathon_id: z.string().uuid().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  created_at: z.string(),
});
export type GameSession = z.infer<typeof gameSessionSchema>;

export const sessionPlayerSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  player_id: z.string().uuid(),
  score: z.number().int().nullable(),
});
export type SessionPlayer = z.infer<typeof sessionPlayerSchema>;

// API input schemas (for POST requests)
export const createSessionSchema = z.object({
  game_id: z.string().uuid(),
  winner_id: z.string().uuid().nullable(),
  starter_id: z.string().uuid().nullable().optional(),
  played_at: z.string().datetime().optional(),
  notes: z.string().max(500).nullable().optional(),
  marathon_id: z.string().uuid().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  scores: z
    .array(
      z.object({
        player_id: z.string().uuid(),
        score: z.number().int().nullable(),
      })
    )
    .optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const createGameSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
  category: gameCategorySchema,
  min_players: z.number().int().min(1).max(20).optional().default(2),
  max_players: z.number().int().min(1).max(20).optional().default(4),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  lowest_score_wins: z.boolean().optional().default(false),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

// LET OP: createGameSchema is het schema voor door de gebruiker ingevulde velden.
// Metadata (image_url, description, ...) hoort hier NOOIT in. De PUT-route gebruikt
// createGameSchema.partial(), dus alles wat hierin staat wordt client-schrijfbaar —
// en het bewerkformulier doet een volledige PUT, dus verse metadata zou overschreven
// worden door een pagina die vóór het verrijken is gerenderd.

/** Handmatig aanpasbare tekstvelden (PATCH /api/games/[id]). */
export const updateGameTextSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  rules_summary: z.string().max(3000).nullable().optional(),
  variant_note: z.string().max(500).nullable().optional(),
  parent_game_id: z.string().uuid().nullable().optional(),
});
export type UpdateGameTextInput = z.infer<typeof updateGameTextSchema>;

/**
 * Handmatig geplakte doosfoto (PATCH /api/games/[id]).
 *
 * Los van updateGameTextSchema: een foto zet het tekstslot niet aan, en andersom.
 */
export const updateGameImageSchema = z.object({
  image_url: z
    .string()
    .max(2000)
    .refine(isDisplayableImageUrl, "Gebruik een volledige https-URL naar een afbeelding")
    .nullable()
    .optional(),
});
export type UpdateGameImageInput = z.infer<typeof updateGameImageSchema>;

/**
 * Interne schrijfvorm voor metadata. Bewust een TypeScript-type en geen Zod-schema:
 * dit wordt nooit uit een request body geparsed, alleen server-side samengesteld.
 */
export type GameMetadataPatch = {
  bgg_id?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  year_published?: number | null;
  bgg_rating?: number | null;
  bgg_weight?: number | null;
  playing_time_minutes?: number | null;
  description?: string | null;
  rules_summary?: string | null;
  variant_note?: string | null;
  parent_game_id?: string | null;
  text_source?: TextSource | null;
  text_locked?: boolean;
  bgg_synced_at?: string | null;
  bgg_sync_error?: string | null;
};

// Stats types (derived, not from DB directly)
export const playerStatsSchema = z.object({
  player: playerSchema,
  wins: z.number().int(),
  total_games: z.number().int(),
  win_percentage: z.number(),
  current_streak: z.number().int(),
  longest_streak: z.number().int(),
});
export type PlayerStats = z.infer<typeof playerStatsSchema>;

export const topGameSchema = z.object({
  game: gameSchema,
  play_count: z.number().int(),
});
export type TopGame = z.infer<typeof topGameSchema>;

const sessionScoreSchema = z.object({
  player: playerSchema,
  score: z.number().int().nullable(),
});

export const scoreHighlightsSchema = z.object({
  highest_score: z
    .object({ score: z.number().int(), player: playerSchema, game: gameSchema })
    .nullable(),
  avg_scores: z.array(
    z.object({ player: playerSchema, avg: z.number() })
  ),
  biggest_diff: z
    .object({ diff: z.number().int(), played_at: z.string(), game: gameSchema })
    .nullable(),
});
export type ScoreHighlights = z.infer<typeof scoreHighlightsSchema>;

export const scoreTrendEntrySchema = z.object({
  played_at: z.string(),
  scores: z.array(sessionScoreSchema),
});

export const statsResponseSchema = z.object({
  leaderboard: z.array(playerStatsSchema),
  // Gasten staan apart van het hoofd-leaderboard, en alleen als ze in deze periode
  // daadwerkelijk gespeeld hebben.
  guest_leaderboard: z.array(playerStatsSchema).optional(),
  top_games: z.array(topGameSchema),
  recent_sessions: z.array(
    gameSessionSchema.extend({
      game: gameSchema,
      winner: playerSchema.nullable(),
      scores: z.array(sessionScoreSchema).optional(),
    })
  ),
  score_highlights: scoreHighlightsSchema.optional(),
  score_trend: z.array(scoreTrendEntrySchema).optional(),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

export const periodFilterSchema = z.enum([
  "today",
  "this_week",
  "this_season",
  "all",
  "this_year",
  "last_year",
]);
export type PeriodFilter = z.infer<typeof periodFilterSchema>;

// Een concreet seizoen, in tegenstelling tot "this_season" hierboven. De enum kan niet
// dragen wélk kwartaal je bedoelt, dus dat gaat via deze aparte vorm.
export const seasonRefSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  quarter: z.number().int().min(1).max(4),
});
export type SeasonRefInput = z.infer<typeof seasonRefSchema>;

// Marathon types
export const marathonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type Marathon = z.infer<typeof marathonSchema>;

export const createMarathonSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateMarathonInput = z.infer<typeof createMarathonSchema>;

// Hype facts & winner highlights — shared shape
export const factToneSchema = z.enum(["coral", "mint", "lavender", "yellow"]);
export type FactTone = z.infer<typeof factToneSchema>;

export const hypeFactSchema = z.object({
  icon: z.string(),
  text: z.string(),
  tone: factToneSchema,
});
export type HypeFact = z.infer<typeof hypeFactSchema>;

export const preGameHypeResponseSchema = z.object({
  facts: z.array(hypeFactSchema),
});
export type PreGameHypeResponse = z.infer<typeof preGameHypeResponseSchema>;

// Badge die direct na een sessie is ontgrendeld
export const sessionBadgeSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  name: z.string(),
  description: z.string(),
  tier: z.enum(["bronze", "silver", "gold"]),
});
export type SessionBadge = z.infer<typeof sessionBadgeSchema>;

export const sessionHighlightsResponseSchema = z.object({
  highlights: z.array(hypeFactSchema),
  newBadges: z.array(sessionBadgeSchema),
});
export type SessionHighlightsResponse = z.infer<typeof sessionHighlightsResponseSchema>;

// API input schema for PATCH /api/sessions/[id]
export const updateSessionSchema = z.object({
  // Nullable, net als bij createSessionSchema: null betekent gelijkspel. Zonder
  // .nullable() faalde het opslaan van een gelijkspel op de validatie.
  winner_id: z.string().uuid().nullable().optional(),
  starter_id: z.string().uuid().nullable().optional(),
  played_at: z.string().datetime().optional(),
  notes: z.string().max(500).nullable().optional(),
  scores: z
    .array(
      z.object({
        player_id: z.string().uuid(),
        score: z.number().int().nullable(),
      })
    )
    .optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
