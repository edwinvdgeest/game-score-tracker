import { z } from "zod";

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
  created_at: z.string(),
});
export type Player = z.infer<typeof playerSchema>;

export const createGuestPlayerSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(10).default("🎭"),
});
export type CreateGuestPlayerInput = z.infer<typeof createGuestPlayerSchema>;

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
});
export type Game = z.infer<typeof gameSchema>;

export type GameWithStats = Game & {
  totalSessions: number;
  lastPlayedAt: string | null;
  topWinner: { name: string; emoji: string; winPercentage: number } | null;
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

export const periodFilterSchema = z.enum(["all", "this_year", "last_year"]);
export type PeriodFilter = z.infer<typeof periodFilterSchema>;

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

// API input schema for PATCH /api/sessions/[id]
export const updateSessionSchema = z.object({
  winner_id: z.string().uuid().optional(),
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
