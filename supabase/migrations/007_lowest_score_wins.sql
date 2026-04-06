-- Add lowest_score_wins flag to games table
-- When true, the player with the LOWEST score wins (e.g. golf, certain card games)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS lowest_score_wins boolean NOT NULL DEFAULT false;
