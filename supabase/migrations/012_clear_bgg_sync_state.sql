-- 012_clear_bgg_sync_state.sql
-- De BoardGameGeek-koppeling is verwijderd: die API eist sinds 2 juli 2025 een
-- Bearer-token en gaf hier alleen nog 401's. Doosfoto's gaan nu met de hand, via het
-- URL-veld in het bewerkformulier.
--
-- De sync-administratie heeft daarmee geen betekenis meer. De kolommen blijven wel
-- staan: ze zijn nullable, kosten niets, en droppen is onomkeerbaar.
-- Run this migration manually in Supabase Studio (SQL editor).
-- Deze migratie is idempotent: opnieuw draaien is veilig.

UPDATE games
SET bgg_sync_error = NULL,
    bgg_synced_at  = NULL
WHERE bgg_sync_error IS NOT NULL
   OR bgg_synced_at IS NOT NULL;
