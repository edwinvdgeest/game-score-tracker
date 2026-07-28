-- 010_game_metadata.sql
-- Voegt spel-metadata toe: doosfoto's van BoardGameGeek + Nederlandse omschrijving/speluitleg.
-- Run this migration manually in Supabase Studio (SQL editor).
-- Deze migratie is idempotent: opnieuw draaien is veilig.

ALTER TABLE games
  -- BoardGameGeek-koppeling en de daaruit opgehaalde feiten
  ADD COLUMN IF NOT EXISTS bgg_id               integer,
  ADD COLUMN IF NOT EXISTS image_url            text,
  ADD COLUMN IF NOT EXISTS thumbnail_url        text,
  ADD COLUMN IF NOT EXISTS year_published       integer,
  ADD COLUMN IF NOT EXISTS bgg_rating           numeric(3,1),
  ADD COLUMN IF NOT EXISTS bgg_weight           numeric(3,2),
  ADD COLUMN IF NOT EXISTS playing_time_minutes integer,
  -- Nederlandse teksten
  ADD COLUMN IF NOT EXISTS description          text,
  ADD COLUMN IF NOT EXISTS rules_summary        text,
  ADD COLUMN IF NOT EXISTS variant_note         text,
  -- Variant-koppeling: "Qwixx Ketting" wijst naar "Qwixx" en erft diens doosfoto
  -- en omschrijving. variant_note is dan het enige eigen tekstveld.
  ADD COLUMN IF NOT EXISTS parent_game_id       uuid REFERENCES games(id) ON DELETE SET NULL,
  -- Herkomst + slot. text_locked wordt uitsluitend gezet door een handmatige
  -- bewerking en beschermt die tekst tegen de seed-migratie en tegen automatisch
  -- verrijken. text_source legt vast waar de tekst vandaan komt.
  ADD COLUMN IF NOT EXISTS text_source          text,
  ADD COLUMN IF NOT EXISTS text_locked          boolean NOT NULL DEFAULT FALSE,
  -- Sync-administratie. bgg_synced_at wordt bij ELKE poging gezet, ook bij falen:
  -- dat voedt zowel de cooldown in de API-route als het "sla al geprobeerde over"
  -- van het backfill-script.
  ADD COLUMN IF NOT EXISTS bgg_synced_at        timestamptz,
  ADD COLUMN IF NOT EXISTS bgg_sync_error       text;

-- ADD CONSTRAINT kent geen IF NOT EXISTS; de DO-blokken maken dit bestand herdraaibaar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_text_source_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_text_source_check
      CHECK (text_source IN ('seed', 'bgg', 'claude', 'handmatig'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_no_self_parent') THEN
    ALTER TABLE games ADD CONSTRAINT games_no_self_parent
      CHECK (parent_game_id IS NULL OR parent_game_id <> id);
  END IF;
END $$;

-- Bewust NIET uniek: tien "Keer op Keer"-varianten wijzen allemaal naar dezelfde
-- BGG-entry, en dat is hier precies de bedoeling.
CREATE INDEX IF NOT EXISTS idx_games_bgg_id
  ON games (bgg_id) WHERE bgg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_parent_game
  ON games (parent_game_id) WHERE parent_game_id IS NOT NULL;

-- Geen index op bgg_synced_at: bij enkele tientallen rijen scant Postgres toch
-- sequentieel en is een extra index alleen maar onderhoud.
