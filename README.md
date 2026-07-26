# Spelscores 🎲

Score tracker voor Edwin & Lisanne (en soms Minou). Score loggen in 2 taps, direct inzicht in wie er wint.

## Lokaal draaien

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis project aan
2. Ga naar **SQL Editor** en voer de migrations uit in deze volgorde:

| # | Bestand | Wat het doet |
|---|---------|-------------|
| 1 | `001_create_tables.sql` | Tabellen, enum en indexes |
| 2 | `002_seed_data.sql` | 3 spelers + 30 spellen |
| 3 | `002_nullable_winner_cleanup.sql` | `winner_id` mag NULL zijn = gelijkspel |
| 4 | `003_games_favorite_archive.sql` | Favoriet ⭐ en archiveren |
| 5 | `004_marathon_mode.sql` | Marathon Mode |
| 6 | `005_guest_players.sql` | Gastspelers |
| 7 | `006_difficulty_duration.sql` | Moeilijkheidsgraad en speelduur |
| 8 | `007_lowest_score_wins.sql` | Laagste score wint per spel |
| 9 | `008_player_management.sql` | `include_by_default` voor spelersbeheer |
| 10 | `009_backfill_session_players.sql` | Ontbrekende deelnemersrijen aanvullen |

> Let op: er zijn twee bestanden met prefix `002`. Draai `002_seed_data.sql` vóór
> `002_nullable_winner_cleanup.sql`.
>
> Gebruik altijd de **SQL Editor**, niet de Table Editor. Die zet RLS aan op nieuwe
> tabellen, en omdat de app met de anon key werkt zouden alle queries daarna stil falen.
>
> `009_backfill_session_players.sql` is niet terug te draaien. Lees het waarschuwingsblok
> bovenaan dat bestand en exporteer eerst een CSV-backup.

### 2. Environment instellen

```bash
cp .env.example .env.local
```

Vul in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — te vinden in Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — te vinden op dezelfde pagina
- `SUPABASE_SERVICE_ROLE_KEY` — alleen nodig voor het import script (API keys sectie)

### 3. Installeren en starten

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

Het script slaat dubbele rijen automatisch over op basis van datum + spel.

## Badges testen

De badge-logica (`lib/achievements.ts`) heeft een zelftest op verzonnen sessies — handig na het
toevoegen van een nieuwe badge, geen database nodig:

```bash
npx tsx scripts/test-achievements.ts
```

## Deployen naar Vercel

1. Push naar GitHub
2. Importeer in [vercel.com](https://vercel.com)
3. Stel de environment variables in (zelfde als `.env.local`, zonder `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy!

## Schermen

| Scherm | Pad | Beschrijving |
|--------|-----|-------------|
| Quick Log | `/` | Game kiezen → winnaar → confetti 🎉 |
| Scorebord | `/dashboard` | Leaderboard, streaks, grafieken |
| Spellen | `/games` | Lijst beheren, nieuw spel toevoegen |
| Badges | `/achievements` | 40 badges per speler, gegroepeerd per categorie |

## Tech Stack

- **Next.js 16** (App Router, TypeScript strict mode)
- **Supabase** (PostgreSQL)
- **Tailwind CSS v4** + shadcn/ui
- **Recharts** voor grafieken
- **react-confetti** voor win-animaties
- **Zod** voor validatie
- **date-fns** voor datumformattering
