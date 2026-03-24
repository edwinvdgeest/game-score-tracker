# Game Score Tracker — Design Spec
_Date: 2026-03-24_

## Problem
Edwin en Lisanne (+ soms Minou) spelen meerdere keren per week bordspellen en kaartspellen. Ze houden scores bij in een Google Sheet met formulier, maar dat is traag en onoverzichtelijk. Er is behoefte aan een snelle, mooie, mobiele app.

Bestaande dataset: 442 rijen, 30 unieke games, sinds januari 2022.

## Doel
- Score loggen in ≤3 taps
- Dashboard laadt in <1 seconde
- 100% bestaande data importeerbaar via CSV-script

---

## Architectuur

### Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript strict mode)
- **Styling**: Tailwind CSS + shadcn/ui (overridden naar vrolijk palet)
- **Database**: Supabase (PostgreSQL), Supabase JS client
- **Validatie**: Zod (types afgeleid via `z.infer`)
- **Grafieken**: Recharts
- **Animaties**: react-confetti voor win-confetti, Tailwind animate voor micro-animaties
- **Fonts**: Nunito (Google Fonts via next/font)
- **Hosting**: Vercel + Supabase gratis tiers

### Project Structuur
```
game-score-tracker/
├── app/
│   ├── layout.tsx              # Root layout met font + theme
│   ├── page.tsx                # Quick Log (home)
│   ├── dashboard/page.tsx      # Dashboard
│   ├── games/page.tsx          # Game Beheer
│   └── api/
│       ├── sessions/route.ts   # POST nieuwe sessie
│       ├── games/route.ts      # GET/POST games
│       └── stats/route.ts      # GET statistieken
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── quick-log/              # GameGrid, WinnerPicker, ConfirmLog
│   ├── dashboard/              # Leaderboard, StreakCard, GameChart, RecentGames
│   └── games/                  # GameList, AddGameForm
├── lib/
│   ├── supabase.ts             # Supabase client (server + client)
│   ├── schemas.ts              # Alle Zod schemas
│   └── queries.ts              # Database query functions
├── scripts/
│   └── import-google-sheet.ts  # CSV import script
├── supabase/
│   └── migrations/             # SQL migration files
├── .env.example
└── README.md
```

---

## Datamodel

```sql
-- Players (seed: Edwin 🎯, Lisanne 🌟, Minou 🦋)
players { id uuid PK, name text, emoji text, is_active bool, created_at timestamptz }

-- Games (seed: 30 games)
games { id uuid PK, name text, emoji text, category enum, min_players int, max_players int, created_at timestamptz }
-- category: 'bordspel' | 'kaartspel' | 'dobbelspel' | 'woordspel' | 'overig'

-- Game Sessions
game_sessions { id uuid PK, game_id uuid FK, played_at timestamptz, day_of_week int, winner_id uuid FK, starter_id uuid FK nullable, notes text nullable, created_at timestamptz }

-- Session Players (scores per player per sessie)
session_players { id uuid PK, session_id uuid FK, player_id uuid FK, score int nullable }
```

---

## Key Screens

### 1. Home / Quick Log
- Grid van games (kaarten met emoji + naam), recent gespeeld bovenaan
- Tap game → selecteer winnaar (grote knoppen met speler-emoji)
- Optioneel: starter + scores
- Opslaan → confetti-animatie + terug naar grid

### 2. Dashboard
- Header: wie leidt overall (grote winnaar-banner met kroon 👑)
- Leaderboard met win%, games gespeeld, huidige streak
- Winstreak kaarten (huidig + all-time record per speler)
- Bar chart meest gespeelde games (Recharts)
- Recente games timeline (laatste 10)
- Filters: "Dit jaar", "Vorig jaar", "Alles"

### 3. Game Beheer
- Lijst van alle games (naam + emoji + categorie)
- Formulier: game toevoegen (naam, emoji, categorie)

---

## Design

- **Kleuren**: koraal `#FF6B6B`, warm geel `#FFE66D`, mint `#4ECDC4`, lavendel `#A29BFE`, warm wit `#FFF9F0`
- **Font**: Nunito (Google Fonts)
- **Emoji's** als visuele markers overal
- **Confetti** bij het loggen van een win (react-confetti)
- **Mobile-first**: touch targets ≥44px, grid voor games

---

## API Routes

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/games | Alle games ophalen |
| POST | /api/games | Nieuwe game aanmaken |
| POST | /api/sessions | Nieuwe sessie loggen |
| GET | /api/stats | Statistieken (leaderboard, streaks, top games) |

---

## Data Import Script
`scripts/import-google-sheet.ts`
- Leest CSV met kolommen: Datum, Game, Winnaar, Beginner, Score Edwin, Score Lisanne, Weekdag
- Mapt naar datamodel
- Idempotent (overslaat dubbele rijen op basis van game + datum)
- Draait met `npx tsx scripts/import-google-sheet.ts <pad-naar-csv>`

---

## Environment Variables (Zod-gevalideerd)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # alleen voor import script
```

---

## Constraints
- Geen auth voor MVP
- Geen placeholder data — seed data of lege states
- UI-teksten in het Nederlands
- Code-comments in het Engels
- TypeScript strict mode, geen `any`
- `npm run dev` werkt zonder extra configuratie (env vars uitgezonderd)
