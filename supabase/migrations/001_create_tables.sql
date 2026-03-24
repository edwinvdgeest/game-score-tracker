-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Game categories
create type game_category as enum ('bordspel', 'kaartspel', 'dobbelspel', 'woordspel', 'overig');

-- Games
create table games (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '🎲',
  category game_category not null default 'bordspel',
  min_players int not null default 2,
  max_players int not null default 4,
  created_at timestamptz not null default now()
);

-- Game sessions
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  played_at timestamptz not null default now(),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  winner_id uuid not null references players(id) on delete restrict,
  starter_id uuid references players(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Session players (scores per player per session)
create table session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  score int,
  unique(session_id, player_id)
);

-- Indexes for common queries
create index idx_game_sessions_played_at on game_sessions(played_at desc);
create index idx_game_sessions_winner_id on game_sessions(winner_id);
create index idx_game_sessions_game_id on game_sessions(game_id);
create index idx_session_players_session_id on session_players(session_id);
