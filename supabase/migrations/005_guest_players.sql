-- Voeg is_guest kolom toe aan players tabel
-- Gastspelers worden opgeslagen en hergebruikt binnen een avond/weekend,
-- maar tellen NIET mee in het hoofd-leaderboard.
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- Index voor snelle filtering op gastsepelers
CREATE INDEX IF NOT EXISTS idx_players_is_guest ON players (is_guest);
