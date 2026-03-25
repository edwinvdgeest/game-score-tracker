-- 002_nullable_winner_cleanup.sql
-- Make winner_id nullable (supports automatic tie detection → winner_id = NULL)
-- AND clean up the fake "Gelijkspel" player

-- Step 1: Make winner_id nullable
ALTER TABLE game_sessions ALTER COLUMN winner_id DROP NOT NULL;

-- Step 2: Set winner_id = NULL for sessions where winner was "Gelijkspel"
UPDATE game_sessions
SET winner_id = NULL
WHERE winner_id IN (
  SELECT id FROM players WHERE name = 'Gelijkspel'
);

-- Step 3: Delete session_players records for Gelijkspel
DELETE FROM session_players
WHERE player_id IN (
  SELECT id FROM players WHERE name = 'Gelijkspel'
);

-- Step 4: Delete the Gelijkspel player
DELETE FROM players WHERE name = 'Gelijkspel';
