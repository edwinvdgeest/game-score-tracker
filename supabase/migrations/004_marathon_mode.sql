-- Marathon Mode: speelavonden met meerdere potjes achter elkaar
-- INSTRUCTIE: Voer deze migratie handmatig uit in Supabase Studio (SQL Editor)

CREATE TABLE marathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT, -- bijv. "Spellenavond 26 maart"
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor actieve marathon lookup
CREATE INDEX idx_marathons_is_active ON marathons (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_marathons_started_at ON marathons (started_at DESC);

-- Koppel sessies aan een marathon
ALTER TABLE game_sessions ADD COLUMN marathon_id UUID REFERENCES marathons(id);
CREATE INDEX idx_game_sessions_marathon_id ON game_sessions (marathon_id);
