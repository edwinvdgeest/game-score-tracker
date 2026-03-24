# Game Score Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een mobiele score-tracker app voor Edwin & Lisanne met Quick Log, Dashboard en Game Beheer.

**Architecture:** Next.js 14 App Router met Supabase (PostgreSQL) als backend. API routes voor data-mutaties, server components voor initieel laden van data, client components voor interactieve UI. Geen auth.

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase JS v2, Zod, Recharts, react-confetti, Nunito font

---

## File Structure

```
game-score-tracker/
├── app/
│   ├── layout.tsx                    # Root layout: font, nav, theme vars
│   ├── globals.css                   # Tailwind base + custom CSS vars
│   ├── page.tsx                      # Quick Log (home)
│   ├── dashboard/page.tsx            # Dashboard
│   ├── games/page.tsx                # Game Beheer
│   └── api/
│       ├── games/route.ts            # GET all games, POST new game
│       ├── sessions/route.ts         # POST new session
│       └── stats/route.ts            # GET leaderboard/streaks/top-games
├── components/
│   ├── ui/                           # shadcn/ui (auto-generated)
│   ├── layout/nav.tsx                # Bottom navigation bar
│   ├── quick-log/
│   │   ├── game-grid.tsx             # Grid of game cards
│   │   ├── winner-picker.tsx         # Pick winner step
│   │   └── session-form.tsx          # Full form: game→winner→(starter+scores)→save
│   ├── dashboard/
│   │   ├── leaderboard.tsx           # Player standings
│   │   ├── streak-cards.tsx          # Current + all-time streaks
│   │   ├── top-games-chart.tsx       # Recharts bar chart
│   │   ├── recent-games.tsx          # Last 10 games timeline
│   │   └── period-filter.tsx         # Year filter tabs
│   └── games/
│       ├── game-list.tsx             # Table/grid of all games
│       └── add-game-form.tsx         # Form to add new game
├── lib/
│   ├── env.ts                        # Zod-validated env vars
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client (singleton)
│   │   └── server.ts                 # Server Supabase client (per-request)
│   ├── schemas.ts                    # All Zod schemas + inferred types
│   ├── queries.ts                    # All DB query functions
│   └── utils.ts                      # Date helpers, streak calculation
├── scripts/
│   └── import-google-sheet.ts        # CSV import script
├── supabase/
│   └── migrations/
│       ├── 001_create_tables.sql
│       └── 002_seed_data.sql
├── .env.example
├── README.md
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/edwinvandergeest/Documents/Development
npx create-next-app@latest game-score-tracker \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
```

- [ ] **Step 2: Install dependencies**

```bash
cd game-score-tracker
npm install @supabase/supabase-js zod recharts react-confetti
npm install date-fns
npm install -D @types/react @types/node tsx
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: Style=default, Base color=neutral, CSS variables=yes

- [ ] **Step 4: Add shadcn components**

```bash
npx shadcn@latest add button card tabs badge select dialog form input label toast
```

- [ ] **Step 5: Install Google Font (Nunito)**

Nunito wordt geladen via `next/font/google` in layout.tsx — geen npm package nodig.

- [ ] **Step 6: Update tsconfig.json voor strict mode**

Replace content of `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
};

export default nextConfig;
```

- [ ] **Step 8: Verify project starts**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000 without errors.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with shadcn/ui and dependencies"
```

---

## Task 2: Environment Configuration

**Files:**
- Create: `lib/env.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Create .env.example**

```bash
cat > .env.example << 'EOF'
# Supabase Project URL (find in: project settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key (find in: project settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Supabase Service Role Key (only for import script — NEVER expose client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
EOF
```

- [ ] **Step 2: Create .env.local with actual values**

Copy `.env.example` to `.env.local` and fill in Supabase credentials.

- [ ] **Step 3: Create lib/env.ts**

```typescript
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check .env.local against .env.example");
}

export const env = parsed.data;
```

- [ ] **Step 4: Add .env.local to .gitignore**

Verify `.gitignore` includes `.env.local` (create-next-app adds this automatically).

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts .env.example .gitignore
git commit -m "feat: add Zod-validated environment configuration"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Singleton browser client — safe to import in client components
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Server-side client — use in API routes and server components
export function createServerClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Service role client — only for scripts, bypasses RLS
export function createServiceClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service role client");
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase client setup (browser + server)"
```

---

## Task 4: Supabase Schema Migrations

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`, `supabase/migrations/002_seed_data.sql`

- [ ] **Step 1: Create migration 001 — tables**

Create `supabase/migrations/001_create_tables.sql`:

```sql
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
```

- [ ] **Step 2: Create migration 002 — seed data**

Create `supabase/migrations/002_seed_data.sql`:

```sql
-- Seed players
insert into players (name, emoji) values
  ('Edwin', '🎯'),
  ('Lisanne', '🌟'),
  ('Minou', '🦋');

-- Seed games
insert into games (name, emoji, category, min_players, max_players) values
  ('Catan', '🏝️', 'bordspel', 3, 4),
  ('Ticket to Ride', '🚂', 'bordspel', 2, 5),
  ('Azul', '🔷', 'bordspel', 2, 4),
  ('Wingspan', '🦅', 'bordspel', 1, 5),
  ('7 Wonders Duel', '🏛️', 'bordspel', 2, 2),
  ('Patchwork', '🧩', 'bordspel', 2, 2),
  ('Jaipur', '🐪', 'kaartspel', 2, 2),
  ('Splendor', '💎', 'bordspel', 2, 4),
  ('Codenames Duet', '🕵️', 'bordspel', 2, 8),
  ('Kingdomino', '👑', 'bordspel', 2, 4),
  ('Cascadia', '🦦', 'bordspel', 1, 4),
  ('Everdell', '🍄', 'bordspel', 1, 4),
  ('Quacks of Quedlinburg', '🧪', 'dobbelspel', 2, 4),
  ('Sagrada', '🪟', 'dobbelspel', 1, 4),
  ('Terraforming Mars', '🪐', 'bordspel', 1, 5),
  ('Ark Nova', '🦏', 'bordspel', 1, 4),
  ('Viticulture', '🍇', 'bordspel', 1, 6),
  ('Parks', '🌲', 'bordspel', 1, 5),
  ('Calico', '🐱', 'bordspel', 1, 4),
  ('Photosynthesis', '🌳', 'bordspel', 2, 4),
  ('Sushi Go', '🍣', 'kaartspel', 2, 5),
  ('Love Letter', '💌', 'kaartspel', 2, 6),
  ('The Crew', '🚀', 'kaartspel', 2, 5),
  ('Hanabi', '🎆', 'kaartspel', 2, 5),
  ('Exploding Kittens', '💣', 'kaartspel', 2, 5),
  ('Uno', '🃏', 'kaartspel', 2, 10),
  ('Yahtzee', '🎲', 'dobbelspel', 1, 10),
  ('Scrabble', '🔤', 'woordspel', 2, 4),
  ('Rummikub', '🀄', 'bordspel', 2, 4),
  ('Skip-Bo', '📚', 'kaartspel', 2, 6);
```

- [ ] **Step 3: Apply migrations to Supabase**

Open Supabase dashboard → SQL Editor → run `001_create_tables.sql` → run `002_seed_data.sql`.

(Alternatively, if Supabase CLI is installed: `supabase db push`)

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migrations and seed data"
```

---

## Task 5: Zod Schemas + TypeScript Types

**Files:**
- Create: `lib/schemas.ts`

- [ ] **Step 1: Create lib/schemas.ts**

```typescript
import { z } from "zod";

// Enums
export const gameCategorySchema = z.enum([
  "bordspel",
  "kaartspel",
  "dobbelspel",
  "woordspel",
  "overig",
]);
export type GameCategory = z.infer<typeof gameCategorySchema>;

// Database row types (returned from Supabase)
export const playerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type Player = z.infer<typeof playerSchema>;

export const gameSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  category: gameCategorySchema,
  min_players: z.number().int(),
  max_players: z.number().int(),
  created_at: z.string(),
});
export type Game = z.infer<typeof gameSchema>;

export const gameSessionSchema = z.object({
  id: z.string().uuid(),
  game_id: z.string().uuid(),
  played_at: z.string(),
  day_of_week: z.number().int().min(0).max(6),
  winner_id: z.string().uuid(),
  starter_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});
export type GameSession = z.infer<typeof gameSessionSchema>;

export const sessionPlayerSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  player_id: z.string().uuid(),
  score: z.number().int().nullable(),
});
export type SessionPlayer = z.infer<typeof sessionPlayerSchema>;

// API input schemas (for POST requests)
export const createSessionSchema = z.object({
  game_id: z.string().uuid(),
  winner_id: z.string().uuid(),
  starter_id: z.string().uuid().nullable().optional(),
  played_at: z.string().datetime().optional(), // defaults to now
  notes: z.string().max(500).nullable().optional(),
  scores: z
    .array(
      z.object({
        player_id: z.string().uuid(),
        score: z.number().int().nullable(),
      })
    )
    .optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const createGameSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
  category: gameCategorySchema,
  min_players: z.number().int().min(1).max(20).optional().default(2),
  max_players: z.number().int().min(1).max(20).optional().default(4),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

// Stats types (derived, not from DB directly)
export const playerStatsSchema = z.object({
  player: playerSchema,
  wins: z.number().int(),
  total_games: z.number().int(),
  win_percentage: z.number(),
  current_streak: z.number().int(),
  longest_streak: z.number().int(),
});
export type PlayerStats = z.infer<typeof playerStatsSchema>;

export const topGameSchema = z.object({
  game: gameSchema,
  play_count: z.number().int(),
});
export type TopGame = z.infer<typeof topGameSchema>;

export const statsResponseSchema = z.object({
  leaderboard: z.array(playerStatsSchema),
  top_games: z.array(topGameSchema),
  recent_sessions: z.array(
    gameSessionSchema.extend({
      game: gameSchema,
      winner: playerSchema,
    })
  ),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

export const periodFilterSchema = z.enum(["all", "this_year", "last_year"]);
export type PeriodFilter = z.infer<typeof periodFilterSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/schemas.ts
git commit -m "feat: add Zod schemas and inferred TypeScript types"
```

---

## Task 6: Utility Functions

**Files:**
- Create: `lib/utils.ts` (extend existing if shadcn created it)

- [ ] **Step 1: Update lib/utils.ts**

shadcn creates `lib/utils.ts` with a `cn` helper. Add streak calculation and date helpers:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, getYear, startOfYear, endOfYear } from "date-fns";
import { nl } from "date-fns/locale";
import type { PeriodFilter } from "@/lib/schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string for display in Dutch */
export function formatDate(dateString: string): string {
  return format(new Date(dateString), "d MMMM yyyy", { locale: nl });
}

/** Format a date string as short date */
export function formatShortDate(dateString: string): string {
  return format(new Date(dateString), "d MMM", { locale: nl });
}

/** Get day of week (0=Sunday) from a Date */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Calculate current win streak for a player.
 * sessions must be sorted by played_at DESC (newest first).
 * Returns number of consecutive wins at the start of the list.
 */
export function calculateCurrentStreak(
  sessions: Array<{ winner_id: string }>,
  playerId: string
): number {
  let streak = 0;
  for (const session of sessions) {
    if (session.winner_id === playerId) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate longest win streak for a player from a list of all sessions.
 * sessions must be sorted by played_at ASC (oldest first).
 */
export function calculateLongestStreak(
  sessions: Array<{ winner_id: string }>,
  playerId: string
): number {
  let longest = 0;
  let current = 0;
  for (const session of sessions) {
    if (session.winner_id === playerId) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

/** Get date range for a period filter */
export function getPeriodDateRange(
  period: PeriodFilter
): { from: string; to: string } | null {
  const now = new Date();
  if (period === "all") return null;
  if (period === "this_year") {
    return {
      from: startOfYear(now).toISOString(),
      to: endOfYear(now).toISOString(),
    };
  }
  // last_year
  const lastYear = new Date(getYear(now) - 1, 0, 1);
  return {
    from: startOfYear(lastYear).toISOString(),
    to: endOfYear(lastYear).toISOString(),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: add utility functions for dates and streak calculation"
```

---

## Task 7: Database Query Functions

**Files:**
- Create: `lib/queries.ts`

- [ ] **Step 1: Create lib/queries.ts**

```typescript
import { createServerClient } from "@/lib/supabase/server";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getPeriodDateRange,
} from "@/lib/utils";
import type {
  Game,
  Player,
  PlayerStats,
  TopGame,
  StatsResponse,
  PeriodFilter,
  CreateSessionInput,
  CreateGameInput,
} from "@/lib/schemas";

/** Fetch all active players */
export async function getPlayers(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Failed to fetch players: ${error.message}`);
  return data ?? [];
}

/** Fetch all games ordered by most recently played */
export async function getGames(): Promise<Game[]> {
  const supabase = createServerClient();
  // Get games with their last played date via a join
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("name");
  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return data ?? [];
}

/** Fetch games sorted by most recently played (for Quick Log grid) */
export async function getGamesSortedByRecent(): Promise<Game[]> {
  const supabase = createServerClient();
  const { data: sessions, error: sessErr } = await supabase
    .from("game_sessions")
    .select("game_id, played_at")
    .order("played_at", { ascending: false });
  if (sessErr) throw new Error(`Failed to fetch sessions: ${sessErr.message}`);

  const { data: games, error: gamesErr } = await supabase
    .from("games")
    .select("*");
  if (gamesErr) throw new Error(`Failed to fetch games: ${gamesErr.message}`);

  if (!games) return [];

  // Build a map of game_id → last played date
  const lastPlayed = new Map<string, string>();
  for (const session of sessions ?? []) {
    if (!lastPlayed.has(session.game_id)) {
      lastPlayed.set(session.game_id, session.played_at as string);
    }
  }

  // Sort: recently played first, then alphabetically for never-played
  return [...games].sort((a, b) => {
    const aDate = lastPlayed.get(a.id);
    const bDate = lastPlayed.get(b.id);
    if (aDate && bDate) return bDate.localeCompare(aDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Create a new game session */
export async function createSession(input: CreateSessionInput): Promise<void> {
  const supabase = createServerClient();
  const playedAt = input.played_at ?? new Date().toISOString();
  const dayOfWeek = new Date(playedAt).getDay();

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      game_id: input.game_id,
      played_at: playedAt,
      day_of_week: dayOfWeek,
      winner_id: input.winner_id,
      starter_id: input.starter_id ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (sessionError) throw new Error(`Failed to create session: ${sessionError.message}`);
  if (!session) throw new Error("No session returned after insert");

  if (input.scores && input.scores.length > 0) {
    const { error: scoresError } = await supabase.from("session_players").insert(
      input.scores.map((s) => ({
        session_id: session.id,
        player_id: s.player_id,
        score: s.score,
      }))
    );
    if (scoresError) throw new Error(`Failed to save scores: ${scoresError.message}`);
  }
}

/** Create a new game */
export async function createGame(input: CreateGameInput): Promise<Game> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("games")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`Failed to create game: ${error.message}`);
  if (!data) throw new Error("No game returned after insert");
  return data as Game;
}

/** Get stats (leaderboard, streaks, top games, recent sessions) for a period */
export async function getStats(period: PeriodFilter): Promise<StatsResponse> {
  const supabase = createServerClient();
  const dateRange = getPeriodDateRange(period);

  // Build session query
  let sessionQuery = supabase
    .from("game_sessions")
    .select("*, game:games(*), winner:players!winner_id(*)")
    .order("played_at", { ascending: false });

  if (dateRange) {
    sessionQuery = sessionQuery
      .gte("played_at", dateRange.from)
      .lte("played_at", dateRange.to);
  }

  const { data: sessions, error: sessError } = await sessionQuery;
  if (sessError) throw new Error(`Failed to fetch sessions: ${sessError.message}`);

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true);
  if (playersError) throw new Error(`Failed to fetch players: ${playersError.message}`);

  const allSessions = sessions ?? [];
  const allPlayers = (players ?? []) as Player[];

  // Calculate leaderboard
  const leaderboard: PlayerStats[] = allPlayers.map((player) => {
    const wins = allSessions.filter((s) => s.winner_id === player.id).length;
    // MVP approximation: all sessions in period count as total_games for each player.
    // Edwin & Lisanne play every game together; Minou plays occasionally.
    // For accurate per-player totals we would need to join session_players.
    const totalGames = allSessions.length;

    // For accurate total games per player, count sessions within period
    // Using a simpler approach: total_games = all sessions in period (both play)
    // This is approximate; for MVP this is acceptable
    const currentStreak = calculateCurrentStreak(allSessions, player.id);
    const longestStreak = calculateLongestStreak(
      [...allSessions].reverse(), // ASC order
      player.id
    );

    return {
      player,
      wins,
      total_games: allSessions.length,
      win_percentage: allSessions.length > 0 ? (wins / allSessions.length) * 100 : 0,
      current_streak: currentStreak,
      longest_streak: longestStreak,
    };
  });

  // Sort leaderboard by wins descending
  leaderboard.sort((a, b) => b.wins - a.wins);

  // Calculate top games
  const gamePlayCounts = new Map<string, { game: Game; count: number }>();
  for (const session of allSessions) {
    const game = session.game as Game;
    const existing = gamePlayCounts.get(game.id);
    if (existing) {
      existing.count++;
    } else {
      gamePlayCounts.set(game.id, { game, count: 1 });
    }
  }

  const top_games: TopGame[] = Array.from(gamePlayCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ game, count }) => ({ game, play_count: count }));

  const recent_sessions = allSessions.slice(0, 10) as StatsResponse["recent_sessions"];

  return { leaderboard, top_games, recent_sessions };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries.ts
git commit -m "feat: add database query functions for sessions, games, and stats"
```

---

## Task 8: API Routes

**Files:**
- Create: `app/api/games/route.ts`, `app/api/sessions/route.ts`, `app/api/stats/route.ts`

- [ ] **Step 1: Create games API route**

Create `app/api/games/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getGames, createGame } from "@/lib/queries";
import { createGameSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const games = await getGames();
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createGameSchema.parse(body);
    const game = await createGame(input);
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create sessions API route**

Create `app/api/sessions/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createSession } from "@/lib/queries";
import { createSessionSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createSessionSchema.parse(body);
    await createSession(input);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create stats API route**

Create `app/api/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getStats } from "@/lib/queries";
import { periodFilterSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodRaw = searchParams.get("period") ?? "all";
    const period = periodFilterSchema.parse(periodRaw);
    const stats = await getStats(period);
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ongeldig filter" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for games, sessions, and stats"
```

---

## Task 9: Global Layout + Styling

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `components/layout/nav.tsx`

- [ ] **Step 1: Update globals.css with custom theme**

Replace/update `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Vrolijk kleurenpalet */
    --coral: #FF6B6B;
    --yellow: #FFE66D;
    --mint: #4ECDC4;
    --lavender: #A29BFE;
    --warm-white: #FFF9F0;
    --warm-gray: #F7F0E6;

    /* shadcn/ui overrides */
    --background: 44 100% 97%;       /* warm-white */
    --foreground: 20 14% 20%;
    --primary: 0 100% 72%;           /* coral */
    --primary-foreground: 0 0% 100%;
    --secondary: 175 52% 59%;        /* mint */
    --secondary-foreground: 0 0% 100%;
    --muted: 39 100% 93%;
    --muted-foreground: 20 14% 45%;
    --accent: 252 94% 79%;           /* lavender */
    --accent-foreground: 0 0% 100%;
    --card: 0 0% 100%;
    --card-foreground: 20 14% 20%;
    --border: 39 40% 88%;
    --radius: 1rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Nunito', sans-serif;
  }
}

/* Custom utility classes */
@layer utilities {
  .text-coral { color: var(--coral); }
  .bg-coral { background-color: var(--coral); }
  .text-mint { color: var(--mint); }
  .bg-mint { background-color: var(--mint); }
  .bg-warm-white { background-color: var(--warm-white); }
  .bg-warm-gray { background-color: var(--warm-gray); }
}
```

- [ ] **Step 2: Update app/layout.tsx**

```typescript
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Spelscores 🎲",
  description: "Score tracker voor Edwin & Lisanne",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${nunito.variable} font-sans antialiased min-h-screen bg-warm-white pb-20`}>
        <main className="max-w-md mx-auto px-4 pt-6">{children}</main>
        <Nav />
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create bottom navigation**

Create `components/layout/nav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/games", label: "Spellen", emoji: "🎲" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="max-w-md mx-auto flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center py-3 text-xs font-bold transition-colors",
                isActive
                  ? "text-coral"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-2xl mb-0.5">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Update tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
      },
      colors: {
        coral: "#FF6B6B",
        "warm-yellow": "#FFE66D",
        mint: "#4ECDC4",
        lavender: "#A29BFE",
        "warm-white": "#FFF9F0",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        bounce: {
          "0%, 100%": { transform: "translateY(-5%)", animationTimingFunction: "cubic-bezier(0.8,0,1,1)" },
          "50%": { transform: "none", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css components/layout/ tailwind.config.ts
git commit -m "feat: add global layout, theme, and bottom navigation"
```

---

## Task 10: Quick Log Feature

**Files:**
- Modify: `app/page.tsx`
- Create: `components/quick-log/session-form.tsx`, `components/quick-log/game-grid.tsx`, `components/quick-log/winner-picker.tsx`

- [ ] **Step 1: Create the GameGrid component**

Create `components/quick-log/game-grid.tsx`:

```typescript
"use client";

import type { Game } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface GameGridProps {
  games: Game[];
  selectedGameId: string | null;
  onSelect: (game: Game) => void;
}

export function GameGrid({ games, selectedGameId, onSelect }: GameGridProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3 text-foreground">Welk spel?</h2>
      <div className="grid grid-cols-3 gap-2">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
              "min-h-[80px] text-center",
              selectedGameId === game.id
                ? "border-coral bg-coral/10 scale-95"
                : "border-border bg-white hover:border-coral/50 hover:scale-95"
            )}
          >
            <span className="text-2xl mb-1">{game.emoji}</span>
            <span className="text-xs font-bold leading-tight line-clamp-2">
              {game.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the WinnerPicker component**

Create `components/quick-log/winner-picker.tsx`:

```typescript
"use client";

import type { Player } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface WinnerPickerProps {
  players: Player[];
  selectedWinnerId: string | null;
  onSelect: (player: Player) => void;
}

export function WinnerPicker({ players, selectedWinnerId, onSelect }: WinnerPickerProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">Wie won?</h2>
      <div className="grid grid-cols-3 gap-3">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
              "min-h-[100px]",
              selectedWinnerId === player.id
                ? "border-coral bg-coral/10 scale-95"
                : "border-border bg-white hover:border-coral/50"
            )}
          >
            <span className="text-4xl mb-2">{player.emoji}</span>
            <span className="text-sm font-extrabold">{player.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the main SessionForm component**

Create `components/quick-log/session-form.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Game, Player } from "@/lib/schemas";
import { GameGrid } from "./game-grid";
import { WinnerPicker } from "./winner-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Dynamically load confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface SessionFormProps {
  games: Game[];
  players: Player[];
}

type Step = "game" | "winner" | "done";

export function SessionForm({ games, players }: SessionFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("game");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Player | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setStep("winner");
  }, []);

  const handleWinnerSelect = useCallback(
    async (player: Player) => {
      if (!selectedGame) return;
      setSelectedWinner(player);
      setSaving(true);

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            winner_id: player.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Opslaan mislukt");
        }

        // Show confetti!
        setShowConfetti(true);
        setStep("done");

        setTimeout(() => {
          setShowConfetti(false);
          // Reset form
          setStep("game");
          setSelectedGame(null);
          setSelectedWinner(null);
        }, 3500);
      } catch {
        toast({
          title: "Oeps!",
          description: "Er ging iets mis. Probeer opnieuw.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [selectedGame, toast]
  );

  const handleBack = useCallback(() => {
    if (step === "winner") {
      setStep("game");
      setSelectedGame(null);
    }
  }, [step]);

  if (step === "done" && selectedGame && selectedWinner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {showConfetti && (
          <ReactConfetti
            recycle={false}
            numberOfPieces={300}
            colors={["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE"]}
          />
        )}
        <div className="text-6xl mb-4 animate-bounce">{selectedWinner.emoji}</div>
        <h2 className="text-2xl font-extrabold mb-2">
          {selectedWinner.name} wint! 🎉
        </h2>
        <p className="text-muted-foreground font-semibold">
          {selectedGame.emoji} {selectedGame.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-2">
        <div
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            step === "game" || step === "winner" ? "bg-coral" : "bg-border"
          }`}
        />
        <div
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            step === "winner" ? "bg-coral" : "bg-border"
          }`}
        />
      </div>

      {step === "game" && (
        <GameGrid
          games={games}
          selectedGameId={selectedGame?.id ?? null}
          onSelect={handleGameSelect}
        />
      )}

      {step === "winner" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground text-sm font-bold"
            >
              ← {selectedGame?.emoji} {selectedGame?.name}
            </button>
          </div>
          <WinnerPicker
            players={players}
            selectedWinnerId={selectedWinner?.id ?? null}
            onSelect={handleWinnerSelect}
          />
          {saving && (
            <p className="text-center text-muted-foreground text-sm font-semibold animate-pulse">
              Opslaan...
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the Quick Log page**

Replace `app/page.tsx`:

```typescript
import { getGamesSortedByRecent, getPlayers } from "@/lib/queries";
import { SessionForm } from "@/components/quick-log/session-form";

export default async function HomePage() {
  const [games, players] = await Promise.all([
    getGamesSortedByRecent(),
    getPlayers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-foreground">
          Spelscores 🎲
        </h1>
        <p className="text-muted-foreground font-semibold">
          Wie wint er vandaag?
        </p>
      </div>
      <SessionForm games={games} players={players} />
    </div>
  );
}
```

- [ ] **Step 5: Test Quick Log**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Game grid shows all 30 games
- Tapping a game moves to winner picker
- Selecting a winner shows confetti and success state
- After ~3.5s it resets to game grid

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/quick-log/
git commit -m "feat: add Quick Log feature with confetti animation"
```

---

## Task 11: Dashboard Feature

**Files:**
- Create: `app/dashboard/page.tsx`, `components/dashboard/leaderboard.tsx`, `components/dashboard/streak-cards.tsx`, `components/dashboard/top-games-chart.tsx`, `components/dashboard/recent-games.tsx`, `components/dashboard/period-filter.tsx`, `components/dashboard/dashboard-client.tsx`

- [ ] **Step 1: Create PeriodFilter component**

Create `components/dashboard/period-filter.tsx`:

```typescript
"use client";

import type { PeriodFilter } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface PeriodFilterProps {
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
}

const options: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Alles" },
  { value: "this_year", label: "Dit jaar" },
  { value: "last_year", label: "Vorig jaar" },
];

export function PeriodFilterTabs({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex gap-1 bg-warm-gray rounded-2xl p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all",
            value === option.value
              ? "bg-white text-coral shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create Leaderboard component**

Create `components/dashboard/leaderboard.tsx`:

```typescript
import type { PlayerStats } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  leaderboard: PlayerStats[];
}

const rankEmoji = ["👑", "🥈", "🥉"];

export function Leaderboard({ leaderboard }: LeaderboardProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-semibold">
        Nog geen scores 🎲
      </div>
    );
  }

  const leader = leaderboard[0];

  return (
    <div className="space-y-4">
      {/* Leader banner */}
      {leader && leader.wins > 0 && (
        <div className="bg-warm-yellow rounded-3xl p-4 text-center">
          <div className="text-5xl mb-2">{leader.player.emoji}</div>
          <div className="text-xl font-black">{leader.player.name} leidt!</div>
          <div className="text-muted-foreground font-semibold text-sm">
            {leader.wins} wins · {leader.win_percentage.toFixed(0)}%
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((stats, index) => (
          <div
            key={stats.player.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl bg-white border",
              index === 0 && "border-warm-yellow"
            )}
          >
            <span className="text-2xl w-8 text-center">
              {rankEmoji[index] ?? `${index + 1}`}
            </span>
            <span className="text-2xl">{stats.player.emoji}</span>
            <div className="flex-1">
              <div className="font-extrabold">{stats.player.name}</div>
              <div className="text-xs text-muted-foreground font-semibold">
                {stats.total_games} spellen gespeeld
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-coral text-lg">{stats.wins}</div>
              <div className="text-xs text-muted-foreground font-semibold">
                {stats.win_percentage.toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StreakCards component**

Create `components/dashboard/streak-cards.tsx`:

```typescript
import type { PlayerStats } from "@/lib/schemas";

interface StreakCardsProps {
  leaderboard: PlayerStats[];
}

export function StreakCards({ leaderboard }: StreakCardsProps) {
  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">🔥 Streaks</h2>
      <div className="grid grid-cols-2 gap-3">
        {leaderboard.map((stats) => (
          <div key={stats.player.id} className="bg-white rounded-2xl border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stats.player.emoji}</span>
              <span className="font-extrabold text-sm">{stats.player.name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Nu</span>
                <span className="font-black text-coral">
                  {stats.current_streak > 0 ? `${stats.current_streak}🔥` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Record</span>
                <span className="font-black text-mint">{stats.longest_streak}🏆</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TopGamesChart component**

Create `components/dashboard/top-games-chart.tsx`:

```typescript
"use client";

import type { TopGame } from "@/lib/schemas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopGamesChartProps {
  topGames: TopGame[];
}

const COLORS = ["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE", "#FF8E8E"];

export function TopGamesChart({ topGames }: TopGamesChartProps) {
  if (topGames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-semibold">
        Nog geen spellen gespeeld
      </div>
    );
  }

  const data = topGames.slice(0, 8).map((tg) => ({
    name: tg.game.emoji + " " + tg.game.name.split(" ")[0],
    count: tg.play_count,
  }));

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">📊 Meest gespeeld</h2>
      <div className="bg-white rounded-2xl border p-3">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 40, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fontWeight: 700 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [`${value}x`, "Gespeeld"]}
              contentStyle={{ borderRadius: "12px", fontFamily: "Nunito", fontWeight: 700 }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create RecentGames component**

Create `components/dashboard/recent-games.tsx`:

```typescript
import type { StatsResponse } from "@/lib/schemas";
import { formatShortDate } from "@/lib/utils";

type RecentSession = StatsResponse["recent_sessions"][number];

interface RecentGamesProps {
  sessions: RecentSession[];
}

export function RecentGames({ sessions }: RecentGamesProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-semibold">
        Nog geen spellen gespeeld
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">🕐 Recente spellen</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-3 p-3 bg-white rounded-2xl border"
          >
            <span className="text-xl">{session.game.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm truncate">{session.game.name}</div>
              <div className="text-xs text-muted-foreground font-semibold">
                {formatShortDate(session.played_at)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg">{session.winner.emoji}</span>
              <span className="text-xs font-black">{session.winner.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create DashboardClient component (handles period filter + data fetching)**

Create `components/dashboard/dashboard-client.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, StatsResponse } from "@/lib/schemas";
import { PeriodFilterTabs } from "./period-filter";
import { Leaderboard } from "./leaderboard";
import { StreakCards } from "./streak-cards";
import { TopGamesChart } from "./top-games-chart";
import { RecentGames } from "./recent-games";

interface DashboardClientProps {
  initialStats: StatsResponse;
}

export function DashboardClient({ initialStats }: DashboardClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?period=${p}`);
      if (!res.ok) throw new Error("Laden mislukt");
      const data: StatsResponse = await res.json() as StatsResponse;
      setStats(data);
    } catch {
      // Keep existing stats on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period !== "all") {
      void fetchStats(period);
    } else {
      setStats(initialStats);
    }
  }, [period, fetchStats, initialStats]);

  return (
    <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
      <PeriodFilterTabs value={period} onChange={setPeriod} />
      <Leaderboard leaderboard={stats.leaderboard} />
      <StreakCards leaderboard={stats.leaderboard} />
      <TopGamesChart topGames={stats.top_games} />
      <RecentGames sessions={stats.recent_sessions} />
    </div>
  );
}
```

- [ ] **Step 7: Create Dashboard page**

Create `app/dashboard/page.tsx`:

```typescript
import { getStats } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const initialStats = await getStats("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Scorebord 🏆</h1>
        <p className="text-muted-foreground font-semibold">
          Wie wint er het vaakst?
        </p>
      </div>
      <DashboardClient initialStats={initialStats} />
    </div>
  );
}
```

- [ ] **Step 8: Test Dashboard**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard. Verify:
- Leaderboard shows players
- Period filter switches between views
- Charts render (or show empty state if no data)

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: add Dashboard with leaderboard, streaks, charts, and period filter"
```

---

## Task 12: Game Beheer Feature

**Files:**
- Create: `app/games/page.tsx`, `components/games/game-list.tsx`, `components/games/add-game-form.tsx`

- [ ] **Step 1: Create GameList component**

Create `components/games/game-list.tsx`:

```typescript
import type { Game } from "@/lib/schemas";

const categoryLabel: Record<string, string> = {
  bordspel: "Bordspel",
  kaartspel: "Kaartspel",
  dobbelspel: "Dobbelspel",
  woordspel: "Woordspel",
  overig: "Overig",
};

interface GameListProps {
  games: Game[];
}

export function GameList({ games }: GameListProps) {
  return (
    <div className="space-y-2">
      {games.map((game) => (
        <div
          key={game.id}
          className="flex items-center gap-3 p-3 bg-white rounded-2xl border"
        >
          <span className="text-2xl">{game.emoji}</span>
          <div className="flex-1">
            <div className="font-extrabold text-sm">{game.name}</div>
            <div className="text-xs text-muted-foreground font-semibold">
              {categoryLabel[game.category] ?? game.category} · {game.min_players}–{game.max_players} spelers
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create AddGameForm component**

Create `components/games/add-game-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { GameCategory } from "@/lib/schemas";

const categories: Array<{ value: GameCategory; label: string }> = [
  { value: "bordspel", label: "🏠 Bordspel" },
  { value: "kaartspel", label: "🃏 Kaartspel" },
  { value: "dobbelspel", label: "🎲 Dobbelspel" },
  { value: "woordspel", label: "🔤 Woordspel" },
  { value: "overig", label: "🎯 Overig" },
];

export function AddGameForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [category, setCategory] = useState<GameCategory>("bordspel");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji, category }),
      });

      if (!response.ok) {
        throw new Error("Opslaan mislukt");
      }

      toast({
        title: "Spel toegevoegd! 🎉",
        description: `${emoji} ${name} staat nu in de lijst.`,
      });

      setName("");
      setEmoji("🎲");
      setCategory("bordspel");
      setOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Oeps!",
        description: "Er ging iets mis. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-coral hover:bg-coral/90 text-white font-extrabold rounded-2xl py-6 text-base"
      >
        + Spel toevoegen
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white rounded-3xl border p-4 space-y-4"
    >
      <h3 className="font-extrabold text-lg">Nieuw spel toevoegen</h3>

      <div className="space-y-2">
        <Label htmlFor="game-name" className="font-bold">Naam</Label>
        <Input
          id="game-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Wingspan"
          className="rounded-xl font-semibold"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-emoji" className="font-bold">Emoji</Label>
        <Input
          id="game-emoji"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🎲"
          className="rounded-xl font-semibold text-2xl"
          maxLength={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-category" className="font-bold">Categorie</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as GameCategory)}
        >
          <SelectTrigger className="rounded-xl font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className="font-semibold">
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl font-bold"
        >
          Annuleren
        </Button>
        <Button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 bg-coral hover:bg-coral/90 text-white rounded-xl font-extrabold"
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create Game Beheer page**

Create `app/games/page.tsx`:

```typescript
import { getGames } from "@/lib/queries";
import { GameList } from "@/components/games/game-list";
import { AddGameForm } from "@/components/games/add-game-form";

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Spellen 🎲</h1>
        <p className="text-muted-foreground font-semibold">
          {games.length} spellen in de lijst
        </p>
      </div>
      <AddGameForm />
      <GameList games={games} />
    </div>
  );
}
```

- [ ] **Step 4: Test Game Beheer**

```bash
npm run dev
```

Navigate to http://localhost:3000/games. Verify:
- All 30 seeded games are listed
- Add game form opens and saves new game
- Page refreshes to show new game

- [ ] **Step 5: Commit**

```bash
git add app/games/ components/games/
git commit -m "feat: add Game Beheer page with game list and add form"
```

---

## Task 13: CSV Import Script

**Files:**
- Create: `scripts/import-google-sheet.ts`

- [ ] **Step 1: Create the import script**

Create `scripts/import-google-sheet.ts`:

```typescript
/**
 * CSV import script for Google Sheet migration.
 *
 * Usage: npx tsx scripts/import-google-sheet.ts <path-to-csv>
 *
 * Expected CSV columns:
 * Datum, Game, Winnaar, Beginner, Score Edwin, Score Lisanne, Weekdag
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// CSV row schema
const csvRowSchema = z.object({
  Datum: z.string(),
  Game: z.string(),
  Winnaar: z.string(),
  Beginner: z.string().optional().default(""),
  "Score Edwin": z.string().optional().default(""),
  "Score Lisanne": z.string().optional().default(""),
  Weekdag: z.string().optional().default(""),
});
type CsvRow = z.infer<typeof csvRowSchema>;

function parseDutchDate(dateStr: string): Date {
  // Try ISO first
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;

  // Try DD-MM-YYYY or DD/MM/YYYY
  const match = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(`${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`);
  }

  throw new Error(`Cannot parse date: ${dateStr}`);
}

async function run() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-google-sheet.ts <path-to-csv>");
    process.exit(1);
  }

  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const rawRows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as unknown[];

  console.log(`📂 Loaded ${rawRows.length} rows from CSV`);

  // Fetch existing data from DB
  const { data: players } = await supabase.from("players").select("*");
  const { data: games } = await supabase.from("games").select("*");
  const { data: existingSessions } = await supabase
    .from("game_sessions")
    .select("played_at, game_id");

  const playerMap = new Map(
    (players ?? []).map((p: { name: string; id: string }) => [p.name.toLowerCase(), p])
  );
  const gameMap = new Map(
    (games ?? []).map((g: { name: string; id: string }) => [g.name.toLowerCase(), g])
  );

  // Build a set of existing (played_at_date, game_id) to skip duplicates
  const existingKeys = new Set(
    (existingSessions ?? []).map(
      (s: { played_at: string; game_id: string }) =>
        `${s.played_at.slice(0, 10)}_${s.game_id}`
    )
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const rawRow of rawRows) {
    let row: CsvRow;
    try {
      row = csvRowSchema.parse(rawRow);
    } catch (err) {
      console.error("⚠️  Invalid row:", rawRow, err);
      errors++;
      continue;
    }

    // Parse date
    let playedAt: Date;
    try {
      playedAt = parseDutchDate(row.Datum);
    } catch {
      console.error(`⚠️  Cannot parse date: ${row.Datum}`);
      errors++;
      continue;
    }

    // Find game
    const game = gameMap.get(row.Game.toLowerCase());
    if (!game) {
      console.warn(`⚠️  Game not found: "${row.Game}" — skipping`);
      skipped++;
      continue;
    }

    // Check duplicate
    const key = `${playedAt.toISOString().slice(0, 10)}_${game.id}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Find winner
    const winner = playerMap.get(row.Winnaar.toLowerCase());
    if (!winner) {
      console.warn(`⚠️  Winner not found: "${row.Winnaar}" — skipping`);
      skipped++;
      continue;
    }

    // Find starter (optional)
    const starter = row.Beginner ? playerMap.get(row.Beginner.toLowerCase()) : undefined;

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .insert({
        game_id: game.id,
        played_at: playedAt.toISOString(),
        day_of_week: playedAt.getDay(),
        winner_id: winner.id,
        starter_id: starter ? starter.id : null,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error(`❌ Failed to insert session for ${row.Datum} ${row.Game}:`, sessionError.message);
      errors++;
      continue;
    }

    // Insert scores (if available)
    const scores: Array<{ session_id: string; player_id: string; score: number | null }> = [];

    const edwinPlayer = playerMap.get("edwin");
    const lisannePlayer = playerMap.get("lisanne");

    if (edwinPlayer && row["Score Edwin"]) {
      const score = parseInt(row["Score Edwin"], 10);
      if (!isNaN(score)) {
        scores.push({ session_id: session.id, player_id: edwinPlayer.id, score });
      }
    }

    if (lisannePlayer && row["Score Lisanne"]) {
      const score = parseInt(row["Score Lisanne"], 10);
      if (!isNaN(score)) {
        scores.push({ session_id: session.id, player_id: lisannePlayer.id, score });
      }
    }

    if (scores.length > 0) {
      const { error: scoresError } = await supabase
        .from("session_players")
        .insert(scores);
      if (scoresError) {
        console.warn(`⚠️  Failed to insert scores for session ${session.id}:`, scoresError.message);
      }
    }

    existingKeys.add(key);
    imported++;

    if (imported % 50 === 0) {
      console.log(`  ✅ ${imported} rijen geïmporteerd...`);
    }
  }

  console.log(`\n🎉 Import klaar!`);
  console.log(`   ✅ Geïmporteerd: ${imported}`);
  console.log(`   ⏭️  Overgeslagen: ${skipped}`);
  console.log(`   ❌ Fouten: ${errors}`);
}

run().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Install csv-parse and dotenv**

```bash
npm install csv-parse dotenv
```

- [ ] **Step 3: Test the import script (dry run)**

```bash
# If you have a CSV file ready:
npx tsx scripts/import-google-sheet.ts /path/to/your-export.csv

# Without a CSV, verify it compiles:
npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/ package.json package-lock.json
git commit -m "feat: add CSV import script for Google Sheet migration"
```

---

## Task 14: README + Final Polish

**Files:**
- Create: `README.md`
- Modify: various files for final polish

- [ ] **Step 1: Write README.md**

Create `README.md`:

```markdown
# Spelscores 🎲

Score tracker voor Edwin & Lisanne (en soms Minou).

## Lokaal draaien

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een nieuw project aan
2. Ga naar **SQL Editor** en voer de migrations uit in volgorde:
   - `supabase/migrations/001_create_tables.sql`
   - `supabase/migrations/002_seed_data.sql`

### 2. Environment instellen

```bash
cp .env.example .env.local
```

Vul in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — te vinden in Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — te vinden op dezelfde pagina
- `SUPABASE_SERVICE_ROLE_KEY` — alleen nodig voor het import script

### 3. Dependencies installeren en starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Google Sheet importeren

Exporteer je Google Sheet als CSV en draai:

```bash
npx tsx scripts/import-google-sheet.ts /pad/naar/export.csv
```

Verwachte CSV-kolommen: `Datum, Game, Winnaar, Beginner, Score Edwin, Score Lisanne, Weekdag`

Het script slaat dubbele rijen over op basis van datum + spel.

## Deployen naar Vercel

1. Push naar GitHub
2. Importeer in [vercel.com](https://vercel.com)
3. Stel de environment variables in (zelfde als `.env.local`)
4. Deploy!

## Tech Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Supabase** (PostgreSQL)
- **Tailwind CSS** + shadcn/ui
- **Recharts** voor grafieken
- **react-confetti** voor win-animaties
- **Zod** voor validatie
```

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Final lint check**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 4: Final dev server test**

```bash
npm run dev
```

Verify all three pages work:
- `/` — Quick Log grid
- `/dashboard` — Scorebord
- `/games` — Spellen lijst

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions for Edwin"
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final polish and production-ready state"
```

---

## Summary

| Task | Deliverable |
|------|-------------|
| 1 | Next.js project scaffold |
| 2 | Environment config (Zod) |
| 3 | Supabase client setup |
| 4 | DB schema + seed migrations |
| 5 | Zod schemas + types |
| 6 | Utility functions |
| 7 | DB query functions |
| 8 | API routes |
| 9 | Layout + navigation |
| 10 | Quick Log (home) |
| 11 | Dashboard |
| 12 | Game Beheer |
| 13 | CSV import script |
| 14 | README + final polish |
