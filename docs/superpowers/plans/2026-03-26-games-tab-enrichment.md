# Games Tab Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the games tab with three features: session duration logging, per-game difficulty rating (1–5 stars), and min/max players on the suggest page filter.

**Architecture:** All three features extend existing DB tables (games + game_sessions), flow through existing Zod schemas and query functions, and surface in UI components. No new routes or files needed — only modifications to existing ones. The suggest filter is opt-in: a player-count input on /suggest passes `?players=N` to `/api/suggest`.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, Supabase, Zod

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/006_difficulty_duration.sql` | **Create** — adds `difficulty` to games, `duration_minutes` to game_sessions |
| `lib/schemas.ts` | **Modify** — add `difficulty` to gameSchema + createGameSchema, add `duration_minutes` to gameSessionSchema + createSessionSchema |
| `lib/queries.ts` | **Modify** — `getGameStats` selects duration_minutes + computes avg, `createSession` inserts duration_minutes, `getGameSuggestion` accepts optional playerCount filter, `GameDetailStats` type gets `avgDuration` |
| `app/api/suggest/route.ts` | **Modify** — read `?players=N` query param, pass to `getGameSuggestion` |
| `components/games/edit-game-form.tsx` | **Modify** — add difficulty stars + min/max players inputs |
| `components/games/add-game-form.tsx` | **Modify** — add difficulty stars + min/max players inputs |
| `components/games/game-detail-client.tsx` | **Modify** — show difficulty stars, avg duration, min/max players in header area |
| `components/quick-log/score-entry.tsx` | **Modify** — add duration picker (preset buttons + custom input) above save button |
| `components/quick-log/session-form.tsx` | **Modify** — add `duration` state, pass to ScoreEntry, include in POST body |
| `components/suggest/game-suggester.tsx` | **Modify** — add player count state + picker, pass as query param to `/api/suggest` |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/006_difficulty_duration.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 006_difficulty_duration.sql
-- Add difficulty rating (1-5) to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS difficulty integer CHECK (difficulty >= 1 AND difficulty <= 5);

-- Add session duration in minutes to game_sessions table
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes integer CHECK (duration_minutes > 0);
```

> **Note for Edwin:** Run this in Supabase Studio → SQL Editor. `min_players` and `max_players` already exist in the database from migration 001 — no change needed for those columns.

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/006_difficulty_duration.sql
git commit -m "feat: migration — add difficulty to games, duration_minutes to game_sessions"
```

---

## Task 2: Update Zod Schemas

**Files:**
- Modify: `lib/schemas.ts`

- [ ] **Step 1: Add `difficulty` and `duration_minutes` to schemas**

In `gameSchema` (around line 30), add after `is_archived`:
```typescript
difficulty: z.number().int().min(1).max(5).nullable().optional(),
```

In `createGameSchema` (around line 89), add after `max_players`:
```typescript
difficulty: z.number().int().min(1).max(5).nullable().optional(),
```

In `gameSessionSchema` (around line 49), add after `marathon_id`:
```typescript
duration_minutes: z.number().int().positive().nullable().optional(),
```

In `createSessionSchema` (around line 71), add after `marathon_id`:
```typescript
duration_minutes: z.number().int().positive().nullable().optional(),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to schemas.

- [ ] **Step 3: Commit**

```bash
git add lib/schemas.ts
git commit -m "feat: schemas — add difficulty (games) and duration_minutes (sessions)"
```

---

## Task 3: Update Queries

**Files:**
- Modify: `lib/queries.ts`

### 3a: `createSession` — insert duration_minutes

- [ ] **Step 1: Update the insert in `createSession` (around line 230)**

Add `duration_minutes: input.duration_minutes ?? null,` to the insert object:
```typescript
const { data: session, error: sessionError } = await supabase
  .from("game_sessions")
  .insert({
    game_id: input.game_id,
    played_at: playedAt,
    day_of_week: dayOfWeek,
    winner_id: input.winner_id ?? null,
    starter_id: input.starter_id ?? null,
    notes: input.notes ?? null,
    marathon_id: input.marathon_id ?? null,
    duration_minutes: input.duration_minutes ?? null,  // ← new
  })
  .select("id")
  .single();
```

### 3b: `GameDetailStats` type — add avgDuration

- [ ] **Step 2: Update `GameDetailStats` type (around line 308)**

```typescript
export type GameDetailStats = {
  game: Game;
  totalSessions: number;
  lastPlayedAt: string | null;
  avgDuration: number | null;   // ← new: average duration in minutes
  winnerStats: Array<{ player: Player; wins: number; winPercentage: number }>;
  recentSessions: Array<{
    id: string;
    played_at: string;
    winner: Player | null;
    duration_minutes: number | null;  // ← new
  }>;
};
```

### 3c: `getGameStats` — select duration_minutes + compute avg

- [ ] **Step 3: Update session select query (around line 328)**

Change the sessions select to include `duration_minutes`:
```typescript
supabase
  .from("game_sessions")
  .select("id, played_at, winner_id, duration_minutes, winner:players!winner_id(*)")
  .eq("game_id", gameId)
  .order("played_at", { ascending: false }),
```

- [ ] **Step 4: Compute `avgDuration` in `getGameStats` (around line 353, just before the return)**

After the existing `recentSessions` computation:
```typescript
// Compute average duration
const durationsWithValue = sessions
  .map((s) => s.duration_minutes as number | null)
  .filter((d): d is number => d !== null && d > 0);
const avgDuration =
  durationsWithValue.length > 0
    ? Math.round(durationsWithValue.reduce((a, b) => a + b, 0) / durationsWithValue.length)
    : null;

const recentSessions = sessions.slice(0, 10).map((s) => ({
  id: s.id as string,
  played_at: s.played_at as string,
  winner: (s.winner as unknown as Player) ?? null,
  duration_minutes: (s.duration_minutes as number | null) ?? null,  // ← new
}));

return { game, totalSessions, lastPlayedAt, avgDuration, winnerStats, recentSessions };
```

### 3d: `getGameSuggestion` — optional player count filter

- [ ] **Step 5: Update function signature and add filter (around line 363)**

```typescript
export async function getGameSuggestion(playerCount?: number): Promise<Game[]> {
  const supabase = createServerClient();

  const [gamesResult, sessionsResult] = await Promise.all([
    supabase.from("games").select("*").eq("is_archived", false),  // ← also exclude archived
    supabase
      .from("game_sessions")
      .select("game_id, played_at")
      .order("played_at", { ascending: false }),
  ]);

  if (gamesResult.error) throw new Error(gamesResult.error.message);

  let games = (gamesResult.data ?? []) as Game[];
  const sessions = sessionsResult.data ?? [];

  // Filter by player count if provided
  if (playerCount && playerCount > 0) {
    games = games.filter((g) => {
      const minOk = !g.min_players || g.min_players <= playerCount;
      const maxOk = !g.max_players || g.max_players >= playerCount;
      return minOk && maxOk;
    });
  }

  // Build map: game_id → last played date
  const lastPlayed = new Map<string, string>();
  for (const s of sessions) {
    if (!lastPlayed.has(s.game_id as string)) {
      lastPlayed.set(s.game_id as string, s.played_at as string);
    }
  }

  const now = Date.now();

  const scored = games.map((g) => {
    const last = lastPlayed.get(g.id);
    const daysSince = last
      ? (now - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
      : 9999;
    return { game: g, daysSince };
  });

  scored.sort((a, b) => b.daysSince - a.daysSince);
  const candidates = scored.slice(0, Math.min(5, scored.length));

  return candidates.map((c) => c.game);
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add lib/queries.ts
git commit -m "feat: queries — duration in sessions, avg duration in game stats, player filter in suggest"
```

---

## Task 4: Update Suggest API Route

**Files:**
- Modify: `app/api/suggest/route.ts`

- [ ] **Step 1: Read player count from query param**

Replace the entire file:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getGameSuggestion } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playersParam = searchParams.get("players");
    const playerCount =
      playersParam ? parseInt(playersParam, 10) : undefined;
    const games = await getGameSuggestion(
      playerCount && !isNaN(playerCount) && playerCount > 0 ? playerCount : undefined
    );
    return NextResponse.json(games);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/suggest/route.ts
git commit -m "feat: suggest API accepts ?players=N filter"
```

---

## Task 5: Game Forms — Difficulty + Min/Max Players

**Files:**
- Modify: `components/games/edit-game-form.tsx`
- Modify: `components/games/add-game-form.tsx`

### 5a: Edit Game Form

- [ ] **Step 1: Add state + UI to `edit-game-form.tsx`**

Add `difficulty` and player state variables. Replace entire file content:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Game, GameCategory } from "@/lib/schemas";

const categories: Array<{ value: GameCategory; label: string }> = [
  { value: "bordspel", label: "🏠 Bordspel" },
  { value: "kaartspel", label: "🃏 Kaartspel" },
  { value: "dobbelspel", label: "🎲 Dobbelspel" },
  { value: "woordspel", label: "🔤 Woordspel" },
  { value: "overig", label: "🎯 Overig" },
];

interface EditGameFormProps {
  game: Game;
  onClose: () => void;
}

export function EditGameForm({ game, onClose }: EditGameFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(game.name);
  const [emoji, setEmoji] = useState(game.emoji);
  const [category, setCategory] = useState<GameCategory>(game.category);
  const [difficulty, setDifficulty] = useState<number | null>(game.difficulty ?? null);
  const [minPlayers, setMinPlayers] = useState<string>(String(game.min_players ?? 2));
  const [maxPlayers, setMaxPlayers] = useState<string>(String(game.max_players ?? 4));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji,
          category,
          difficulty: difficulty ?? null,
          min_players: parseInt(minPlayers, 10) || 2,
          max_players: parseInt(maxPlayers, 10) || 4,
        }),
      });

      if (!response.ok) throw new Error("Opslaan mislukt");

      toast.success(`${emoji} ${name} bijgewerkt! ✏️`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-[var(--card)] rounded-3xl border p-4 space-y-4"
    >
      <h3 className="font-extrabold text-lg">Spel bewerken ✏️</h3>

      <div className="space-y-1">
        <label htmlFor="edit-game-name" className="text-sm font-bold block">
          Naam
        </label>
        <input
          id="edit-game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-game-emoji" className="text-sm font-bold block">
          Emoji
        </label>
        <input
          id="edit-game-emoji"
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-2xl outline-none focus:border-[var(--color-coral)]"
          maxLength={4}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-game-category" className="text-sm font-bold block">
          Categorie
        </label>
        <select
          id="edit-game-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GameCategory)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)] bg-[var(--card)]"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Moeilijkheidsgraad */}
      <div className="space-y-1">
        <label className="text-sm font-bold block">Moeilijkheidsgraad</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setDifficulty(difficulty === star ? null : star)}
              className="text-2xl transition-transform hover:scale-110 cursor-pointer"
              aria-label={`${star} ster`}
            >
              {star <= (difficulty ?? 0) ? "⭐" : "☆"}
            </button>
          ))}
          {difficulty && (
            <span className="ml-2 text-xs font-semibold self-center" style={{ color: "var(--muted-foreground)" }}>
              {difficulty === 1 ? "Heel makkelijk" : difficulty === 2 ? "Makkelijk" : difficulty === 3 ? "Gemiddeld" : difficulty === 4 ? "Moeilijk" : "Heel moeilijk"}
            </span>
          )}
        </div>
      </div>

      {/* Aantal spelers */}
      <div className="space-y-1">
        <label className="text-sm font-bold block">Aantal spelers</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="edit-min-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Min</label>
            <input
              id="edit-min-players"
              type="number"
              min={1}
              max={20}
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>–</span>
          <div className="flex items-center gap-2">
            <label htmlFor="edit-max-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Max</label>
            <input
              id="edit-max-players"
              type="number"
              min={1}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>spelers</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)]"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 py-2 rounded-xl text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
```

### 5b: Add Game Form

- [ ] **Step 2: Add difficulty + min/max to `add-game-form.tsx`**

Add state:
```typescript
const [difficulty, setDifficulty] = useState<number | null>(null);
const [minPlayers, setMinPlayers] = useState<string>("2");
const [maxPlayers, setMaxPlayers] = useState<string>("4");
```

In `handleSubmit` body JSON, add:
```typescript
body: JSON.stringify({
  name: name.trim(),
  emoji,
  category,
  difficulty: difficulty ?? null,
  min_players: parseInt(minPlayers, 10) || 2,
  max_players: parseInt(maxPlayers, 10) || 4,
}),
```

In the reset after success:
```typescript
setDifficulty(null);
setMinPlayers("2");
setMaxPlayers("4");
```

Add the same difficulty stars + min/max players JSX sections (identical to edit form) before the button row.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/games/edit-game-form.tsx components/games/add-game-form.tsx
git commit -m "feat: game forms — difficulty stars, min/max players inputs"
```

---

## Task 6: Game Detail Page — Show Difficulty, Avg Duration, Players

**Files:**
- Modify: `components/games/game-detail-client.tsx`

- [ ] **Step 1: Add difficulty stars, avg duration, player count to stat section**

After the existing 2-column stat grid (keer gespeeld / laatste keer gespeeld), add a new info section in the header area. Replace the header section (lines 38–57) to also show difficulty and players below the category badge:

```typescript
<div>
  <div className="text-5xl mb-1">{game.emoji}</div>
  <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
    {game.name}
  </h1>
  <div className="flex items-center gap-2 flex-wrap mt-1">
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
    >
      {game.category}
    </span>
    {game.min_players && game.max_players && (
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "var(--color-warm-gray)", color: "var(--muted-foreground)" }}
      >
        👥 {game.min_players}–{game.max_players} spelers
      </span>
    )}
    {game.difficulty && (
      <span className="text-xs font-bold" title={`Moeilijkheid: ${game.difficulty}/5`}>
        {"⭐".repeat(game.difficulty)}{"☆".repeat(5 - game.difficulty)}
      </span>
    )}
  </div>
</div>
```

After the existing 2-column stat grid, add avg duration card (only when `avgDuration` is not null). Extend the grid to show 3 items when duration exists:

```typescript
{/* Stat kaarten */}
<div className={`grid gap-3 ${stats.avgDuration ? "grid-cols-3" : "grid-cols-2"}`}>
  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--color-warm-gray)" }}>
    <div className="text-3xl font-black" style={{ color: "var(--color-coral)" }}>
      {totalSessions}
    </div>
    <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
      keer gespeeld
    </div>
  </div>
  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--color-warm-gray)" }}>
    <div className="text-sm font-black" style={{ color: "var(--color-coral)" }}>
      {lastPlayedAt ? formatDate(lastPlayedAt) : "Nooit"}
    </div>
    <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
      laatste keer
    </div>
  </div>
  {stats.avgDuration && (
    <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--color-warm-gray)" }}>
      <div className="text-2xl font-black" style={{ color: "var(--color-coral)" }}>
        {stats.avgDuration}m
      </div>
      <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
        gem. duur
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/games/game-detail-client.tsx
git commit -m "feat: game detail — show difficulty stars, avg duration, player count"
```

---

## Task 7: Session Form — Duration Picker

**Files:**
- Modify: `components/quick-log/score-entry.tsx`
- Modify: `components/quick-log/session-form.tsx`

### 7a: Extend ScoreEntry with duration picker

- [ ] **Step 1: Update `ScoreEntry` props and add duration UI**

Update the interface and component to accept `duration` + `onDurationChange`:

```typescript
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

interface ScoreEntryProps {
  players: Player[];
  scores: Record<string, string>;
  onChange: (playerId: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  duration: number | null;
  onDurationChange: (mins: number | null) => void;
}
```

Add the duration section between the scores list and the save button:
```typescript
{/* Speelduur (optioneel) */}
<div className="mt-4 space-y-2">
  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
    ⏱️ Hoe lang gespeeld? (optioneel)
  </p>
  <div className="flex flex-wrap gap-1.5">
    {DURATION_PRESETS.map((mins) => (
      <button
        key={mins}
        type="button"
        onClick={() => onDurationChange(duration === mins ? null : mins)}
        className="px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer"
        style={{
          borderColor: duration === mins ? "var(--color-coral)" : "var(--border)",
          backgroundColor: duration === mins
            ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
            : "var(--card)",
          color: duration === mins ? "var(--color-coral)" : "var(--muted-foreground)",
        }}
      >
        {mins}m
      </button>
    ))}
    {/* Custom input */}
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={600}
      placeholder="Anders"
      value={duration && !DURATION_PRESETS.includes(duration) ? String(duration) : ""}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        onDurationChange(!isNaN(v) && v > 0 ? v : null);
      }}
      className="w-20 px-2 py-1.5 rounded-xl border-2 font-bold text-xs text-center outline-none"
      style={{
        borderColor:
          duration && !DURATION_PRESETS.includes(duration)
            ? "var(--color-coral)"
            : "var(--border)",
        backgroundColor: "var(--card)",
        color: "var(--foreground)",
      }}
    />
  </div>
</div>
```

### 7b: Add duration state to SessionForm

- [ ] **Step 2: Add `duration` state to `session-form.tsx`**

After the existing state declarations (around line 65), add:
```typescript
const [duration, setDuration] = useState<number | null>(null);
```

In `resetForm` callback, add:
```typescript
setDuration(null);
```

In `handleSave`, add `duration_minutes` to the POST body:
```typescript
body: JSON.stringify({
  game_id: selectedGame.id,
  winner_id: computedWinner?.id ?? null,
  starter_id: selectedStarter?.id ?? null,
  scores: scoresArray,
  marathon_id: marathon?.id ?? null,
  duration_minutes: duration ?? null,   // ← new
}),
```

In the `scores` step JSX, pass duration to ScoreEntry:
```typescript
<ScoreEntry
  players={activePlayers}
  scores={scores}
  onChange={handleScoreChange}
  onSave={() => void handleSave(scores)}
  saving={saving}
  duration={duration}
  onDurationChange={setDuration}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/quick-log/score-entry.tsx components/quick-log/session-form.tsx
git commit -m "feat: session form — duration picker (presets + custom) on score step"
```

---

## Task 8: Suggest Page — Player Count Filter

**Files:**
- Modify: `components/suggest/game-suggester.tsx`

- [ ] **Step 1: Add playerCount state and filter UI**

Add `playerCount` state and a simple picker above the spin button. The component fetches `/api/suggest?players=N` when playerCount is set.

Replace the `fetch("/api/suggest")` line in the `spin` function:
```typescript
const url = playerCount ? `/api/suggest?players=${playerCount}` : "/api/suggest";
const res = await fetch(url);
```

Add `playerCount` state at the top of the component:
```typescript
const [playerCount, setPlayerCount] = useState<number | null>(null);
```

Add the player picker UI above the spin button (between the display card and the spin button):
```typescript
{/* Spelers filter */}
<div className="space-y-2">
  <p className="text-xs font-bold uppercase tracking-wide text-center" style={{ color: "var(--muted-foreground)" }}>
    👥 Hoeveel spelers?
  </p>
  <div className="flex justify-center gap-2">
    {[2, 3, 4, 5, 6].map((n) => (
      <button
        key={n}
        onClick={() => setPlayerCount(playerCount === n ? null : n)}
        className="w-10 h-10 rounded-xl border-2 font-extrabold text-sm transition-all cursor-pointer"
        style={{
          borderColor: playerCount === n ? "var(--color-coral)" : "var(--border)",
          backgroundColor: playerCount === n
            ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
            : "var(--card)",
          color: playerCount === n ? "var(--color-coral)" : "var(--muted-foreground)",
        }}
      >
        {n}
      </button>
    ))}
  </div>
  {playerCount && (
    <p className="text-xs font-semibold text-center" style={{ color: "var(--muted-foreground)" }}>
      Alleen spellen voor {playerCount} spelers
    </p>
  )}
</div>
```

Also update the initial load: pass `playerCount` from URL or just leave initial candidates as-is (no server-side filter on initial load — the filter kicks in on first spin).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/suggest/game-suggester.tsx
git commit -m "feat: suggest page — optional player count filter"
```

---

## Task 9: Final Build Check + Push to Main

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: successful build, no errors.

- [ ] **Step 3: Push branch to origin**

```bash
git push origin claude/infallible-black
```

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge claude/infallible-black --no-ff -m "feat: games tab — duration, difficulty, player filter on suggest"
git push origin main
```

- [ ] **Step 5: Done 🎉**

All three features are live:
- ⏱️ Session duration logging with preset buttons
- ⭐ Game difficulty (1–5 stars) on edit/add forms + detail page
- 👥 Min/max players on forms + optional player filter on /suggest
