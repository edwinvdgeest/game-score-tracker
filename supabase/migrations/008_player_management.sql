-- Spelersbeheer: welke spelers staan standaard aangevinkt bij een nieuw potje?
-- INSTRUCTIE: Voer deze migratie handmatig uit in Supabase Studio (SQL Editor).
-- Gebruik de SQL Editor, niet de Table Editor — die zet RLS aan, en omdat de app met de
-- anon key schrijft zouden alle inserts en selects daarna stil falen.

-- Tot nu toe bepaalde de quick-log wizard dit met een string-match op de naam "Minou"
-- (components/quick-log/session-form.tsx). Deze kolom maakt het datagestuurd en
-- beheerbaar in de UI.
--
-- Let op: include_by_default is een ANDERE vraag dan is_active. is_active betekent
-- "verschijnt nog in de app"; include_by_default betekent "staat standaard aangevinkt".
-- Een speler die af en toe meedoet is actief maar niet standaard aangevinkt.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS include_by_default boolean NOT NULL DEFAULT false;

-- De twee vaste spelers spelen elk potje mee. Pas de namen aan als jullie
-- huishouden anders heet.
UPDATE players
SET include_by_default = true
WHERE is_guest = false
  AND name IN ('Edwin', 'Lisanne');

-- Controle: moet 2 teruggeven.
-- SELECT count(*) FROM players WHERE include_by_default;
