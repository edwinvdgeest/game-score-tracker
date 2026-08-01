-- 013_starter_matters.sql
-- Niet elk spel heeft een betekenisvolle beginner: bij Take 5 worden gewoon kaarten
-- gedeeld. Voor die spellen slaat de quick-log-wizard de "Wie begon?"-stap over en
-- verdwijnt het Beginnersvoordeel van de spelpagina.
-- Run this migration manually in Supabase Studio (SQL editor).
-- Deze migratie is idempotent: opnieuw draaien is veilig.

-- DEFAULT TRUE: alle bestaande spellen houden de beginner-stap, en getStarterStats,
-- de pre-game hype en de badges openingszet/underdog blijven op de bestaande data werken.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS starter_matters boolean NOT NULL DEFAULT TRUE;
