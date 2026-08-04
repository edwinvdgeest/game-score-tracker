-- 014_game_rounds.sql
-- Rondes: sommige spellen worden in meerdere rondes gespeeld, in verschillende vormen.
-- Run this migration manually in Supabase Studio (SQL editor).
-- Deze migratie is idempotent: opnieuw draaien is veilig.
--
-- DE INVARIANT VAN DIT ONTWERP:
--   session_players.score blijft het EINDTOTAAL en game_sessions.winner_id blijft de
--   winnaar. session_rounds is uitsluitend de onderbouwing daarvan. Niets buiten de
--   quick-log-wizard, createSession/updateSession en /history weet dat rondes bestaan.
--   Daarom hoefden het leaderboard, de badges, de duel-pagina, de spotlight, de
--   seizoenen en het jaaroverzicht geen letter te veranderen. Houd dat zo: laat nooit
--   een statistiek rechtstreeks op session_rounds rekenen.

ALTER TABLE games
  -- 'geen'    = geen rondes, één eindscore per speler (het gedrag van vóór deze migratie)
  -- 'vast'    = vast aantal rondes (round_count), bijv. Skull King met 10
  -- 'grens'   = spelen tot iemand round_target haalt, bijv. Take 5 tot 66
  -- 'vrij'    = zoveel rondes als je wil; de speler drukt zelf op klaar
  -- 'winnaar' = geen punten, per ronde een winnaar; de meeste gewonnen rondes wint
  ADD COLUMN IF NOT EXISTS round_format text NOT NULL DEFAULT 'geen',
  ADD COLUMN IF NOT EXISTS round_count  integer,
  ADD COLUMN IF NOT EXISTS round_target integer;

-- Tekst met een CHECK in plaats van een Postgres-enum, net als games.text_source in
-- migratie 010: CREATE TYPE kent geen IF NOT EXISTS, en een vorm toevoegen is straks
-- twee regels in plaats van een onomkeerbare ALTER TYPE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_round_format_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_round_format_check
      CHECK (round_format IN ('geen','vast','grens','vrij','winnaar'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_round_count_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_round_count_check
      CHECK (round_count IS NULL OR round_count BETWEEN 1 AND 50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_round_target_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_round_target_check
      CHECK (round_target IS NULL OR round_target > 0);
  END IF;

  -- Bij 'winnaar' IS de score het aantal gewonnen rondes. "Laagste score wint" zou dan
  -- de speler met de MINSTE gewonnen rondes tot winnaar maken. lowest_score_wins wordt
  -- op zes losse plekken in queries.ts uit de database gelezen; die kun je niet
  -- allemaal betrouwbaar afschermen, dus de combinatie mag simpelweg niet bestaan.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_winnaar_not_lowest') THEN
    ALTER TABLE games ADD CONSTRAINT games_winnaar_not_lowest
      CHECK (round_format <> 'winnaar' OR lowest_score_wins = false);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_rounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number >= 1),
  -- RESTRICT, net als session_players.player_id: spelers met historie worden
  -- gedeactiveerd en niet verwijderd (zie deleteOrDeactivatePlayer).
  player_id    uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  -- Punten in deze ronde. Bij round_format 'winnaar': 1 voor de winnaar van de ronde,
  -- 0 voor de rest — er wordt dus een rij geschreven voor ELKE deelnemer, zodat
  -- max(round_number) het aantal gespeelde rondes blijft. NULL = niets ingevuld,
  -- dezelfde betekenis als session_players.score.
  score        integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Dekt meteen de enige query die er is: WHERE session_id = ? ORDER BY round_number.
  UNIQUE (session_id, round_number, player_id)
);

-- Toegang gelijktrekken met de bestaande tabellen. De app praat met de ANON key
-- (zie lib/supabase/server.ts) en geen enkele tabel in dit project gebruikt RLS.
--
-- DIT IS NIET OPTIONEEL. Supabase zet RLS zelf aan op een nieuwe tabel in het
-- public-schema — óók als je hem netjes via de SQL Editor aanmaakt. Zonder de regel
-- hieronder staat session_rounds dus wél op RLS terwijl session_players dat niet doet,
-- en dan weigert Postgres elke insert met "new row violates row-level security policy":
-- een potje met rondes is niet op te slaan. Nagemeten met
--   select relname, relrowsecurity from pg_class
--   where relname in ('session_players','session_rounds');
-- Beide regels zijn een no-op als alles al goed staat.
ALTER TABLE session_rounds DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE session_rounds TO anon, authenticated, service_role;

-- PostgREST (de REST-laag waar supabase-js op praat) houdt een schema-cache bij. Een
-- vers aangemaakte tabel zit daar soms nog niet in, en dan krijg je
-- "Could not find the table 'public.session_rounds' in the schema cache" — óók als de
-- tabel er gewoon staat. Dit duwt de cache meteen bij.
NOTIFY pgrst, 'reload schema';
