-- Add favorite and archive columns to games table
-- Run this migration manually in Supabase Studio (SQL editor)
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
