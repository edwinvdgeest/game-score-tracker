# Games Page Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verbeter de /games pagina met sorteren, groeperen, mini-stats, favorieten, archiveren en een slimmere "Nieuw spel" form.

**Architecture:** Nieuwe server-side query `getGamesWithStats()` haalt spellen op met sessie-statistieken. Een nieuwe client component `GameList` verzorgt alle interactiviteit (sorteren, groeperen, favorieten, archiveren). Favoriet/archief-status wordt opgeslagen in Supabase via twee nieuwe kolommen in de `games` tabel.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS v4, Lucide React, date-fns (nl locale)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/003_games_favorite_archive.sql` | Create | Voeg is_favorite en is_archived kolommen toe |
| `lib/schemas.ts` | Modify | Voeg is_favorite, is_archived toe aan gameSchema |
| `lib/queries.ts` | Modify | Voeg getGamesWithStats() toe, update getGamesSortedByRecent() |
| `app/api/games/[id]/route.ts` | Modify | Voeg PATCH handler toe voor favorite/archive toggle |
| `app/games/page.tsx` | Modify | Gebruik getGamesWithStats() |
| `components/games/game-list.tsx` | Rewrite | Rijke client component met alle features |
| `components/games/add-game-form.tsx` | Modify | Auto-suggereer emoji op basis van categorie |
| `app/page.tsx` | Modify | Gebruik getGamesSortedByRecent() die archived filtert |

---

### Task 1: Migration SQL

**Files:**
- Create: `supabase/migrations/003_games_favorite_archive.sql`

- [ ] Schrijf migration file met ALTER TABLE statements
- [ ] Commit

```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
```

---

### Task 2: Update schemas.ts

**Files:**
- Modify: `lib/schemas.ts`

- [ ] Voeg is_favorite en is_archived toe aan gameSchema als optionele booleans (optional voor backwards-compat totdat migration draait)
- [ ] Export GameWithStats type

---

### Task 3: Add getGamesWithStats query

**Files:**
- Modify: `lib/queries.ts`

- [ ] Schrijf getGamesWithStats() die voor elk spel haalt: session count, last played, top winner (naam + win%)
- [ ] Update getGamesSortedByRecent() om is_archived=true te filteren
- [ ] Voeg toggleGameFavorite(id, value) toe
- [ ] Voeg toggleGameArchive(id, value) toe

---

### Task 4: PATCH endpoint

**Files:**
- Modify: `app/api/games/[id]/route.ts`

- [ ] Voeg PATCH handler toe die is_favorite en is_archived accepteert via updateGame()

---

### Task 5: Rewrite GameList component

**Files:**
- Rewrite: `components/games/game-list.tsx`

- [ ] Client component met useState voor sort, group, showArchived
- [ ] Sorteer opties: meest gespeeld | laatst gespeeld | alfabetisch
- [ ] Favorieten altijd bovenaan (ongeacht sortering)
- [ ] Groepeer-toggle: per categorie sectie headers tonen
- [ ] Mini-stats per kaart: "42x gespeeld", "👑 Edwin (58%)", "3 dagen geleden"
- [ ] Ster-knop per spel (toggle favorite, PATCH API call)
- [ ] Archiveer-knop per spel (via dropdown/knop, PATCH API call)
- [ ] Gearchiveerde spellen verborgen, onderaan toggle om ze te tonen (grayed out)

---

### Task 6: Update AddGameForm

**Files:**
- Modify: `components/games/add-game-form.tsx`

- [ ] Als categorie verandert, suggereer automatisch passende emoji (als gebruiker nog niet handmatig aanpaste)
- [ ] bordspel→🎲, kaartspel→🃏, dobbelspel→🎯, woordspel→📝, overig→🎮

---

### Task 7: Update games page

**Files:**
- Modify: `app/games/page.tsx`

- [ ] Importeer getGamesWithStats() in plaats van getGames()
- [ ] Geef games met stats mee aan GameList

---

### Task 8: Update home page (Quick Log)

**Files:**
- Modify: `app/page.tsx` (of `lib/queries.ts` getGamesSortedByRecent)

- [ ] Zorg dat getGamesSortedByRecent() archived games filtert

---

### Task 9: Commit & Push

- [ ] `git add` alle gewijzigde files
- [ ] `git commit -m "feat: verbeterde spellenlijst met stats, favorieten en archiveren"`
- [ ] `git push origin main` (of merge naar main)
