-- 006_difficulty_duration.sql
-- Add difficulty rating (1–5 stars) to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS difficulty integer CHECK (difficulty >= 1 AND difficulty <= 5);

-- Add session duration in minutes to game_sessions table
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes integer CHECK (duration_minutes > 0);

-- Note: min_players and max_players already exist on the games table (added in migration 001).
-- No changes needed for those columns.
