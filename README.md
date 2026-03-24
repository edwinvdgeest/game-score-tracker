# Spelscores 🎲

Score tracker voor Edwin & Lisanne (en soms Minou). Score loggen in 2 taps, direct inzicht in wie er wint.

## Lokaal draaien

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis project aan
2. Ga naar **SQL Editor** en voer de migrations uit in deze volgorde:
   - `supabase/migrations/001_create_tables.sql`
   - `supabase/migrations/002_seed_data.sql`

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

## Tech Stack

- **Next.js 16** (App Router, TypeScript strict mode)
- **Supabase** (PostgreSQL)
- **Tailwind CSS v4** + shadcn/ui
- **Recharts** voor grafieken
- **react-confetti** voor win-animaties
- **Zod** voor validatie
- **date-fns** voor datumformattering
