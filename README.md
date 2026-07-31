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
| 11 | `010_game_metadata.sql` | Doosfoto's, omschrijving, speluitleg en variant-koppeling |
| 12 | `011_seed_dutch_game_text.sql` | Nederlandse teksten voor de bestaande spellen |
| 13 | `012_clear_bgg_sync_state.sql` | Restanten van de verwijderde BGG-koppeling opruimen |

> Let op: er zijn twee bestanden met prefix `002`. Draai `002_seed_data.sql` vóór
> `002_nullable_winner_cleanup.sql`.
>
> Gebruik altijd de **SQL Editor**, niet de Table Editor. Die zet RLS aan op nieuwe
> tabellen, en omdat de app met de anon key werkt zouden alle queries daarna stil falen.
>
> `009_backfill_session_players.sql` is niet terug te draaien. Lees het waarschuwingsblok
> bovenaan dat bestand en exporteer eerst een CSV-backup.
>
> `011_seed_dutch_game_text.sql` koppelt op spel-id en is daarmee geschreven voor de
> bestaande database. Bij een verse installatie doet het bestand niets — dat is geen
> fout. Een spel waarvan de tekst met de hand is aangepast (`text_locked`) wordt nooit
> overschreven, ook niet als je de migratie opnieuw draait.

### 2. Environment instellen

```bash
cp .env.example .env.local
```

Vul in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — te vinden in Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — te vinden op dezelfde pagina
- `SUPABASE_SERVICE_ROLE_KEY` — alleen nodig voor de scripts (API keys sectie)

Optioneel, zie de toelichting in `.env.example`: `ANTHROPIC_API_KEY`. Zonder die
sleutel draait alles gewoon.

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

## Doosfoto toevoegen

Open een spel → **Bewerken ✏️** → plak een URL bij **🖼️ Doosfoto**. Het voorbeeld
verschijnt meteen; opslaan zet de foto op de spelpagina, in de spellenlijst en in het
quick-log grid. Leeg laten betekent: de emoji, precies zoals eerst.

De makkelijkste bron is BoardGameGeek: open daar het spel in je browser en kopieer het
afbeeldingsadres (`https://cf.geekdo-images.com/...`). Elke andere https-URL werkt ook.

Een spel dat via **Variant van** aan een hoofdspel hangt, gebruikt automatisch diens
doosfoto en tekst. Eén URL bij Qwixx dekt dus meteen alle Qwixx-scorebladen.

> Er was hier eerder een automatische koppeling met de BoardGameGeek XML API. Die is
> verwijderd: BGG eist sinds 2 juli 2025 registratie en een Bearer-token, dus elke
> aanroep gaf 401. De Nederlandse teksten uit migratie 011 en de variant-overerving
> staan daar los van en werken gewoon.

## Tests

De rekenlogica in `lib/` is getest met Vitest op verzonnen sessies — geen database nodig.
Handig na het toevoegen van een badge of het aanpassen van een statistiek:

```bash
npm run test         # eenmalig
npm run test:watch   # blijft meekijken
npm run typecheck    # tsc --noEmit
npm run lint
```

Getest worden de badge-logica (`lib/achievements.ts`), de statistiekberekeningen
(`lib/stats.ts`), de spotlight-kaarten en -voorkeuren (`lib/spotlight.ts`,
`lib/spotlight-prefs.ts`), de deeltekst (`lib/share.ts`) en de datum- en reeks-helpers
(`lib/utils.ts`). Query-functies die Supabase aanroepen worden niet getest: die bevatten alleen
kolomselectie, de berekeningen zijn er bewust uitgetild.

Een paar componenten worden wel getest, omdat daar gedrag in zit en geen opmaak:
`components/home/spotlight-carousel.test.tsx` (bladeren, "minder van dit", startkaart),
`components/home/home-client.test.tsx` ("Nog eens?" zet het spel in het formulier) en
`components/quick-log/game-grid.test.tsx` (het bezettingsfilter). Ze draaien in jsdom via
`// @vitest-environment jsdom` bovenaan het bestand.

## De spotlight op de homepage

Boven het logformulier staat een carrousel met wisselende kaarten. Welke kaarten er zijn
hangt af van de data; `lib/spotlight.ts` bouwt ze en `pickSpotlightCards` kiest er maximaal
zes per bezoek, met een startpunt dat per uur opschuift. Zo zie je niet elke dag hetzelfde.

| Kaart | Wanneer |
|-------|---------|
| 🕰️ N jaar geleden speelden jullie… | Potjes van rond deze kalenderdag, 1 t/m 3 jaar terug — één kaart per jaar met treffers |
| 🎲 Jullie laatste potjes | Altijd, zodra er gespeeld is |
| ⚔️ Tijd voor revanche | Als de achterstaande speler bij een spel structureel verliest (≥3 onderlinge potjes) |
| 🔥 Wie is er warm? / 📊 De stand tot nu toe | Reeks van 2+ winsten, anders de gewone stand |
| 🏆 Uit het recordboek | Hoogste score, grootste verschil, langste potje |
| 📅 Jullie speelritme | Laatste potje, speeldagen op rij, deze maand vs. vorige maand |
| 🧹 Staat al even stil | Spellen die ≥60 dagen (of nooit) gespeeld zijn |
| 🎁 Jullie jaar in cijfers | Alleen in december en januari; linkt naar `/wrapped/<jaar>` |

Elke uitslag- of spelregel heeft een "🎮 Nog eens?"-knop: die zet het spel meteen in het
formulier en springt naar "Wie begon?", zonder paginaherlaad. Zodra er een spel gekozen is
verdwijnt de carrousel en komt er een kaart met de laatste uitslagen van dát spel, de stand,
het record en de gemiddelde speelduur (`/api/games/[id]/recap`).

### Wat je zelf kunt bijsturen

- **🙈 Minder** zet een kaartsoort dertig dagen achteraan. Dat staat in localStorage
  (`spelscores:spotlight:v1`, zie `lib/spotlight-prefs.ts`), dus per apparaat — jij en Lisanne
  mogen een andere mix. De melding heeft een "Ongedaan maken", en onder de stippen staat
  "alles terug" zolang er iets weggezet is. Weggezette soorten verdwijnen niet gegarandeerd:
  is er weinig anders, dan zie je ze liever dan een lege carrousel.
- **Op deze dag.** Is er een potje van precies vandaag, N jaar terug, dan staat er een stip bij
  het 🎮-tabblad (`/api/spotlight/today`) en opent de carrousel op die terugblik. Na een bezoek
  aan de homepage is de stip weg tot morgen.
- **Bezetting.** Het spelraster filtert op het aantal aangevinkte spelers, met een chip
  "🙋 Past bij N spelers · X verborgen" die je met één tik uitzet. Zoeken gaat altijd door
  alles heen, spellen zonder spelersgrenzen blijven staan, en als het filter alles zou wegvegen
  blijft het raster volledig. De 🧹-kaart tipt geen spel dat met deze bezetting niet kan, en
  "🎲 Wat zullen we spelen?" geeft het aantal mee aan `/suggest?players=N`.

## Deployen naar Vercel

1. Push naar GitHub
2. Importeer in [vercel.com](https://vercel.com)
3. Stel de environment variables in (zelfde als `.env.local`, zonder `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy!

### Wat er na een deploy gebeurt

De app is een PWA met een service worker (`public/sw.js`), en die bepaalt wat je te zien
krijgt. De regels:

| Wat | Strategie |
|-----|-----------|
| Pagina's en RSC-payloads | Netwerk eerst; de cache is alleen offline-terugval |
| `/_next/static/*` | Cache eerst — die URLs bevatten een content-hash |
| `/_next/image` | Cache eerst, in een eigen cache die versiebumps overleeft |
| `/api/*` | Netwerk eerst |

Omdat elke pagina `force-dynamic` is, zit de data ín de server-rendered HTML. Zou die
HTML uit de cache komen, dan zie je de scores van de vorige deploy — dat was tot en met
`SW_VERSION = "v3"` het geval. Verander je de strategie of de offline-terugval, bump dan
`SW_VERSION` in `public/sw.js`; de activate-handler gooit de caches van oudere versies weg.

De geïnstalleerde webapp controleert bij elke keer terugkeren naar de app (en verder elk
uur) of er een nieuwe service worker klaarstaat, en herlaadt zichzelf zodra die overneemt.
Daarnaast staat `deploymentId` aan in `next.config.ts`: ziet de client dat de server
inmiddels op een nieuwere deploy draait, dan doet hij een volledige herlaad in plaats van
een client-side navigatie.

## Schermen

| Scherm | Pad | Beschrijving |
|--------|-----|-------------|
| Quick Log | `/` | Spel kiezen → beginner → scores → confetti 🎉. Met notitieveld, deelbare uitslag en de spotlight-carrousel (zie hieronder) |
| Scorebord | `/dashboard` | Leaderboard, streaks, grafieken, gastenblok, seizoensbanner |
| Marathon | `/marathon` | Live scorebord voor een spellenavond, met eindstand |
| Spellen | `/games` | Lijst beheren, favorieten, archiveren, nieuw spel toevoegen |
| Spel | `/games/[id]` | Stats per spel: wie wint, speelduur, recente potjes |
| Seizoenen | `/seasons` | Kwartaalranglijst (3/1/0) en de trofeeënkast |
| Duel | `/duel` | Onderlinge stand per spelerspaar, nemesis-spel, grootste marge |
| Historie | `/history` | Alle potjes; scores, winnaar, datum en notitie corrigeren |
| Badges | `/achievements` | 40 badges per speler, gegroepeerd per categorie |
| Suggestie | `/suggest` | "Wat zullen we spelen?" op basis van wat lang niet gespeeld is |
| Spelers | `/players` | Spelers en gasten beheren, wie standaard meedoet |
| Jaaroverzicht | `/wrapped/[year]` | Deelbare jaarkaart met de cijfers van dat jaar |

## Tech Stack

- **Next.js 16** (App Router, TypeScript strict mode)
- **Supabase** (PostgreSQL)
- **Tailwind CSS v4** + shadcn/ui
- **Recharts** voor grafieken
- **react-confetti** voor win-animaties
- **Zod** voor validatie
- **date-fns** voor datumformattering
