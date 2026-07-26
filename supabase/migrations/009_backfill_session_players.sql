-- Backfill van ontbrekende deelnemersrijen in session_players.
-- INSTRUCTIE: Voer deze migratie handmatig uit in Supabase Studio (SQL Editor),
-- NA 008_player_management.sql. Lees eerst het waarschuwingsblok hieronder.
--
-- ============================================================================
-- WAAROM DIT NODIG IS
-- ============================================================================
-- scripts/import-google-sheet.ts schrijft een rij in session_players alleen wanneer er
-- een score in de CSV stond. Geimporteerde potjes zonder scores hebben dus NUL
-- deelnemersrijen, en potjes waar maar een van de twee een score had hebben er een.
--
-- lib/queries.ts compenseerde dat tot nu toe met een aanname: "geen rijen? dan deden de
-- vaste spelers wel mee". Zolang die aanname bestaat verandert het toevoegen van een
-- nieuwe vaste speler retroactief de statistieken van iedereen. Deze backfill legt de
-- werkelijke deelname vast, zodat die aanname weg kan.
--
-- ============================================================================
-- LEES DIT EERST
-- ============================================================================
-- Deze migratie is NIET terug te draaien. Er is geen kolom die een backfill-rij van een
-- echte rij onderscheidt. Exporteer daarom eerst game_sessions en session_players naar
-- CSV via Supabase Studio.
--
-- Draai per stap eerst de SELECT die erboven staat en bekijk het aantal voordat je de
-- INSERT uitvoert. Stap 3 is een aanname over het verleden: sla hem over als het aantal
-- groot of onverklaarbaar is.
--
-- Alle inserts zijn idempotent via de unique constraint (session_id, player_id) uit
-- 001_create_tables.sql, dus opnieuw draaien kan geen dubbele rijen opleveren.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STAP 1 — Potjes zonder enige deelnemersrij (verplicht, veilig)
-- ----------------------------------------------------------------------------
-- Dit legt een historisch feit vast: in deze periode speelden de twee vaste spelers.
-- De namen staan hier bewust hard in — het is een uitspraak over data uit het verleden,
-- geen regel die de app tijdens gebruik toepast.
--
-- Preview:
-- SELECT count(*) FROM game_sessions s
-- WHERE NOT EXISTS (SELECT 1 FROM session_players sp WHERE sp.session_id = s.id);

INSERT INTO session_players (session_id, player_id, score)
SELECT s.id, p.id, NULL
FROM game_sessions s
CROSS JOIN players p
WHERE p.is_guest = false
  AND p.name IN ('Edwin', 'Lisanne')
  AND NOT EXISTS (
    SELECT 1 FROM session_players sp WHERE sp.session_id = s.id
  )
ON CONFLICT (session_id, player_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- STAP 2 — Winnaars zonder deelnemersrij (verplicht, ondubbelzinnig)
-- ----------------------------------------------------------------------------
-- Je kunt geen potje winnen dat je niet gespeeld hebt. Dit vangt onder andere potjes
-- die Minou of een gast won zonder dat er scores waren ingevuld.
--
-- Preview:
-- SELECT count(*) FROM game_sessions s
-- WHERE s.winner_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM session_players sp
--     WHERE sp.session_id = s.id AND sp.player_id = s.winner_id
--   );

INSERT INTO session_players (session_id, player_id, score)
SELECT s.id, s.winner_id, NULL
FROM game_sessions s
WHERE s.winner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = s.id AND sp.player_id = s.winner_id
  )
ON CONFLICT (session_id, player_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- STAP 3 — Potjes met precies een rij (OPTIONEEL — bekijk eerst het aantal)
-- ----------------------------------------------------------------------------
-- Als in de CSV maar een van de twee scorekolommen gevuld was, is er een rij ontstaan
-- terwijl er twee spelers aan tafel zaten. Dit vult de andere vaste speler aan, maar
-- alleen voor potjes van voor de eerste gastspeler — daarna is "er zaten twee mensen aan
-- tafel" geen veilige aanname meer.
--
-- Preview:
-- SELECT count(*) FROM game_sessions s
-- WHERE (SELECT count(*) FROM session_players sp WHERE sp.session_id = s.id) = 1
--   AND s.played_at < COALESCE(
--     (SELECT min(created_at) FROM players WHERE is_guest), now()
--   );

INSERT INTO session_players (session_id, player_id, score)
SELECT s.id, p.id, NULL
FROM game_sessions s
CROSS JOIN players p
WHERE p.is_guest = false
  AND p.name IN ('Edwin', 'Lisanne')
  AND s.played_at < COALESCE(
    (SELECT min(created_at) FROM players WHERE is_guest), now()
  )
  AND (SELECT count(*) FROM session_players sp WHERE sp.session_id = s.id) = 1
  AND NOT EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = s.id AND sp.player_id = p.id
  )
ON CONFLICT (session_id, player_id) DO NOTHING;

-- ============================================================================
-- CONTROLE NA DE BACKFILL — beide moeten 0 teruggeven
-- ============================================================================
-- Geen enkel potje zonder deelnemers:
-- SELECT count(*) FROM game_sessions s
-- WHERE NOT EXISTS (SELECT 1 FROM session_players sp WHERE sp.session_id = s.id);
--
-- Geen enkele winnaar die geen deelnemer is:
-- SELECT count(*) FROM game_sessions s
-- WHERE s.winner_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM session_players sp
--     WHERE sp.session_id = s.id AND sp.player_id = s.winner_id
--   );
