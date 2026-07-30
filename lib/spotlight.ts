/**
 * De spotlight: de wisselende kaart bovenaan de homepage.
 *
 * Waar de oude herinneringskaart altijd hetzelfde deed ("N jaar geleden speelden jullie…",
 * eerste treffer, klaar), bouwt dit bestand een hele stapel kaartsoorten en laat het de
 * homepage er per bezoek een andere selectie uit tonen. Alle logica is puur en werkt op
 * verzonnen sessies in de tests — Supabase zit in lib/queries.ts.
 *
 * De vorm van een sessie staat hier lokaal beschreven (net als DuelSession in lib/duel.ts)
 * zodat deze module niets van de queries hoeft te weten.
 */

import { differenceInCalendarDays, format, startOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import type { FactTone } from "@/lib/schemas";
import { calculateCurrentStreak, formatDate, formatShortDate } from "@/lib/utils";
import { computeHeadToHead, pairKey, type DuelSession } from "@/lib/duel";

// ─── Vorm van de gegevens ─────────────────────────────────────────────────────

export type SpotlightGame = {
  id: string;
  name: string;
  emoji: string;
  lowest_score_wins: boolean;
};

export type SpotlightPlayer = { id: string; name: string; emoji: string };

export type SpotlightSession = {
  id: string;
  played_at: string;
  winner_id: string | null;
  winner: SpotlightPlayer | null;
  notes: string | null;
  duration_minutes: number | null;
  game: SpotlightGame;
  scores: Array<{ player: SpotlightPlayer; score: number | null }>;
};

export type SpotlightEntry = {
  emoji: string;
  title: string;
  subtitle: string;
  /** Scores van de deelnemers, leeg als er niets is ingevuld. */
  scores: Array<{ emoji: string; score: number; isWinner: boolean }>;
  note: string | null;
  /** Gezet als deze regel een "Nog eens?"-knop verdient. */
  replayGame: { id: string; name: string; emoji: string } | null;
};

export type SpotlightCard = {
  /** Stabiele sleutel, ook gebruikt als React-key en in pickSpotlightCards. */
  id: string;
  emoji: string;
  title: string;
  tone: FactTone;
  entries: SpotlightEntry[];
  footnote?: string;
  /** Doorklikken naar een andere pagina, bv. het jaaroverzicht. */
  cta?: { href: string; label: string };
};

// ─── Instellingen ─────────────────────────────────────────────────────────────

/** Hoeveel dagen rond dezelfde kalenderdag een terugblik meeneemt. */
export const MEMORY_WINDOW_DAYS = 3;
/** Hoeveel jaar terug we terugblikken. */
export const MEMORY_MAX_YEARS_BACK = 3;
/** Hoeveel kaarten er per bezoek in de carrousel komen. */
export const MAX_SPOTLIGHT_CARDS = 6;
/** Onder dit aantal dagen is "lang niet gespeeld" geen nieuws. */
const DUST_MIN_DAYS = 60;
/** Vanaf deze reeks heet het "warm". */
const HOT_STREAK = 2;

// ─── Kleine helpers ───────────────────────────────────────────────────────────

/** Deelnemers-ids van een potje. */
function participantIds(session: SpotlightSession): string[] {
  return session.scores.map((entry) => entry.player.id);
}

/** Alleen de ingevulde scores, oplopend gesorteerd. */
function sortedScores(session: SpotlightSession): number[] {
  return session.scores
    .map((entry) => entry.score)
    .filter((score): score is number => score !== null)
    .sort((a, b) => a - b);
}

/** "🎯 Edwin won" of "🤝 gelijkspel". */
function winnerLabel(session: SpotlightSession): string {
  return session.winner
    ? `${session.winner.emoji} ${session.winner.name} won`
    : "🤝 gelijkspel";
}

function replayRef(game: SpotlightGame) {
  return { id: game.id, name: game.name, emoji: game.emoji };
}

/** Eén potje als kaartregel: spel, datum, winnaar, scores en notitie. */
export function sessionEntry(session: SpotlightSession): SpotlightEntry {
  return {
    emoji: session.game.emoji,
    title: session.game.name,
    subtitle: `${formatDate(session.played_at)} · ${winnerLabel(session)}`,
    scores: session.scores
      .filter((entry) => entry.score !== null)
      .map((entry) => ({
        emoji: entry.player.emoji,
        score: entry.score as number,
        isWinner: entry.player.id === session.winner_id,
      })),
    note: session.notes,
    replayGame: replayRef(session.game),
  };
}

/** Regel zonder scores, voor feiten in plaats van uitslagen. */
function factEntry(
  emoji: string,
  title: string,
  subtitle: string,
  game?: SpotlightGame
): SpotlightEntry {
  return {
    emoji,
    title,
    subtitle,
    scores: [],
    note: null,
    replayGame: game ? replayRef(game) : null,
  };
}

/** "vandaag", "gisteren", "3 dagen geleden", "2 maanden geleden". */
function agoLabel(days: number): string {
  if (days <= 0) return "vandaag";
  if (days === 1) return "gisteren";
  if (days < 60) return `${days} dagen geleden`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months} maanden geleden`;
  return `${Math.floor(months / 12)} jaar geleden`;
}

function yearsAgoLabel(yearsAgo: number): string {
  if (yearsAgo === 1) return "Een jaar geleden";
  return `${yearsAgo} jaar geleden`;
}

// ─── Kaart: terugblik ─────────────────────────────────────────────────────────

/**
 * Eén kaart per jaar waarin rond deze kalenderdag gespeeld is.
 *
 * Anders dan de oude getMemories() stopt dit niet bij de eerste treffer: zijn er potjes van
 * één én van drie jaar terug, dan krijg je twee kaarten en dus meer om door te bladeren.
 */
export function buildMemoryCards(
  sessions: SpotlightSession[],
  today: Date
): SpotlightCard[] {
  const cards: SpotlightCard[] = [];

  for (let yearsAgo = 1; yearsAgo <= MEMORY_MAX_YEARS_BACK; yearsAgo++) {
    const target = new Date(today);
    target.setFullYear(target.getFullYear() - yearsAgo);

    const hits = sessions
      .filter(
        (session) =>
          Math.abs(
            differenceInCalendarDays(new Date(session.played_at), target)
          ) <= MEMORY_WINDOW_DAYS
      )
      .sort(
        (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
      )
      .slice(0, 3);

    if (hits.length === 0) continue;

    cards.push({
      id: `memory-${yearsAgo}y`,
      emoji: "🕰️",
      title: `${yearsAgoLabel(yearsAgo)} speelden jullie…`,
      tone: "lavender",
      entries: hits.map(sessionEntry),
    });
  }

  return cards;
}

// ─── Kaart: laatste potjes ────────────────────────────────────────────────────

export function buildRecentCard(sessions: SpotlightSession[]): SpotlightCard | null {
  const recent = newestFirst(sessions).slice(0, 3);
  if (recent.length === 0) return null;

  return {
    id: "recent",
    emoji: "🎲",
    title: "Jullie laatste potjes",
    tone: "mint",
    entries: recent.map(sessionEntry),
  };
}

// ─── Kaart: streak / stand ────────────────────────────────────────────────────

/**
 * Wie staat er warm? Bij een reeks van twee of meer krijgt de kaart die kop; anders wordt
 * het gewoon de stand, zodat er altijd iets te zien is als er gespeeld is.
 */
export function buildStreakCard(
  sessions: SpotlightSession[],
  players: SpotlightPlayer[]
): SpotlightCard | null {
  const ordered = newestFirst(sessions);
  const streakSessions = ordered.map((session) => ({
    winner_id: session.winner_id,
    player_ids: participantIds(session),
  }));

  const rows = players
    .map((player) => {
      const mine = ordered.filter((session) =>
        participantIds(session).includes(player.id)
      );
      const wins = mine.filter((session) => session.winner_id === player.id).length;
      return {
        player,
        played: mine.length,
        wins,
        streak: calculateCurrentStreak(streakSessions, player.id),
      };
    })
    .filter((row) => row.played > 0)
    .sort((a, b) => b.streak - a.streak || b.wins - a.wins);

  if (rows.length === 0) return null;

  const hot = rows[0] !== undefined && rows[0].streak >= HOT_STREAK;

  return {
    id: "streak",
    emoji: hot ? "🔥" : "📊",
    title: hot ? "Wie is er warm?" : "De stand tot nu toe",
    tone: "coral",
    entries: rows.map((row) =>
      factEntry(
        row.player.emoji,
        row.player.name,
        row.streak >= HOT_STREAK
          ? `🔥 ${row.streak} keer op rij gewonnen`
          : `${row.wins} van ${row.played} potjes gewonnen (${Math.round(
              (row.wins / row.played) * 100
            )}%)`
      )
    ),
  };
}

// ─── Kaart: recordboek ────────────────────────────────────────────────────────

/**
 * Hoogste score, grootste verschil en langste potje.
 *
 * Spellen waar de laagste score wint doen niet mee aan "hoogste score" — dezelfde valkuil
 * die getWrapped() al omzeilt. Voor het grootste verschil maakt de richting niets uit.
 */
export function buildRecordCard(sessions: SpotlightSession[]): SpotlightCard | null {
  const entries: SpotlightEntry[] = [];

  let best: { score: number; session: SpotlightSession; player: SpotlightPlayer } | null =
    null;
  let widest: { margin: number; session: SpotlightSession } | null = null;
  let longest: SpotlightSession | null = null;

  for (const session of sessions) {
    if (!session.game.lowest_score_wins) {
      for (const entry of session.scores) {
        if (entry.score === null) continue;
        if (!best || entry.score > best.score) {
          best = { score: entry.score, session, player: entry.player };
        }
      }
    }

    const scores = sortedScores(session);
    if (scores.length >= 2) {
      const margin = session.game.lowest_score_wins
        ? (scores[1] as number) - (scores[0] as number)
        : (scores[scores.length - 1] as number) - (scores[scores.length - 2] as number);
      if (margin > 0 && (!widest || margin > widest.margin)) {
        widest = { margin, session };
      }
    }

    const duration = session.duration_minutes;
    if (duration !== null && duration > 0) {
      if (!longest || duration > (longest.duration_minutes as number)) longest = session;
    }
  }

  if (best) {
    entries.push(
      factEntry(
        "🥇",
        `Hoogste score ooit: ${best.score}`,
        `${best.player.emoji} ${best.player.name} bij ${best.session.game.name} · ${formatShortDate(
          best.session.played_at
        )}`,
        best.session.game
      )
    );
  }

  if (widest) {
    entries.push(
      factEntry(
        "📏",
        `Grootste verschil: ${widest.margin} punten`,
        `${widest.session.game.name} · ${winnerLabel(widest.session)} · ${formatShortDate(
          widest.session.played_at
        )}`,
        widest.session.game
      )
    );
  }

  if (longest) {
    entries.push(
      factEntry(
        "⏱️",
        `Langste potje: ${longest.duration_minutes} min`,
        `${longest.game.name} · ${formatShortDate(longest.played_at)}`,
        longest.game
      )
    );
  }

  if (entries.length === 0) return null;

  return {
    id: "records",
    emoji: "🏆",
    title: "Uit het recordboek",
    tone: "yellow",
    entries,
  };
}

// ─── Kaart: staat al even stil ────────────────────────────────────────────────

/**
 * Spellen die het langst in de kast staan, met een knop om er meteen een potje van te
 * loggen. Nooit gespeelde spellen staan bovenaan.
 */
export function buildDustCard(
  games: SpotlightGame[],
  sessions: SpotlightSession[],
  today: Date
): SpotlightCard | null {
  const lastPlayed = new Map<string, number>();
  for (const session of sessions) {
    const played = new Date(session.played_at).getTime();
    const known = lastPlayed.get(session.game.id);
    if (known === undefined || played > known) lastPlayed.set(session.game.id, played);
  }

  const candidates = games
    .map((game) => {
      const played = lastPlayed.get(game.id);
      return {
        game,
        daysSince:
          played === undefined
            ? Number.POSITIVE_INFINITY
            : differenceInCalendarDays(today, new Date(played)),
      };
    })
    .filter((row) => row.daysSince >= DUST_MIN_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 3);

  if (candidates.length === 0) return null;

  return {
    id: "dust",
    emoji: "🧹",
    title: "Staat al even stil",
    tone: "mint",
    entries: candidates.map((row) =>
      factEntry(
        row.game.emoji,
        row.game.name,
        Number.isFinite(row.daysSince)
          ? `Voor het laatst ${agoLabel(row.daysSince)}`
          : "Nog nooit gespeeld",
        row.game
      )
    ),
    footnote: "Tijd om er weer eens een potje van te doen?",
  };
}

// ─── Kaart: speelritme ────────────────────────────────────────────────────────

/** Aantal aaneengesloten kalenderdagen met een potje, geteld vanaf de laatste speeldag. */
function playDayStreak(sessions: SpotlightSession[]): number {
  const days = [
    ...new Set(sessions.map((session) => format(new Date(session.played_at), "yyyy-MM-dd"))),
  ]
    .sort()
    .reverse();

  let streak = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const date = new Date(`${day}T12:00:00`);
    if (previous === null || differenceInCalendarDays(previous, date) === 1) {
      streak++;
      previous = date;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Hoe vaak en wanneer er gespeeld wordt: laatste potje, reeks speeldagen op rij, en deze
 * maand tegenover vorige maand.
 */
export function buildRhythmCard(
  sessions: SpotlightSession[],
  today: Date
): SpotlightCard | null {
  const ordered = newestFirst(sessions);
  const last = ordered[0];
  if (!last) return null;

  const entries: SpotlightEntry[] = [];
  const daysSinceLast = differenceInCalendarDays(today, new Date(last.played_at));

  entries.push(
    factEntry(
      last.game.emoji,
      `Laatste potje: ${agoLabel(daysSinceLast)}`,
      `${last.game.name} · ${winnerLabel(last)}`,
      last.game
    )
  );

  // Een reeks van vorige maand is geen reeks meer: alleen melden als er vandaag of gisteren
  // nog gespeeld is.
  const streak = daysSinceLast <= 1 ? playDayStreak(ordered) : 0;
  if (streak >= 2) {
    entries.push(
      factEntry("📆", `${streak} dagen op rij gespeeld`, "Houden jullie dat vol?")
    );
  }

  const monthStart = startOfMonth(today).getTime();
  const previousStart = startOfMonth(subMonths(today, 1)).getTime();
  const inRange = (session: SpotlightSession, from: number, to: number) => {
    const played = new Date(session.played_at).getTime();
    return played >= from && played < to;
  };
  const thisMonth = sessions.filter((s) => inRange(s, monthStart, Number.MAX_SAFE_INTEGER))
    .length;
  const lastMonth = sessions.filter((s) => inRange(s, previousStart, monthStart)).length;

  entries.push(
    factEntry(
      "📈",
      `${thisMonth} ${thisMonth === 1 ? "potje" : "potjes"} deze maand`,
      `Vorige maand waren het er ${lastMonth}`
    )
  );

  const favouriteDay = mostCommonWeekday(sessions);

  return {
    id: "rhythm",
    emoji: "📅",
    title: "Jullie speelritme",
    tone: "coral",
    entries,
    footnote: favouriteDay ? `Favoriete speeldag: ${favouriteDay}.` : undefined,
  };
}

/** Weekdag waarop het vaakst gespeeld is, in het Nederlands. */
function mostCommonWeekday(sessions: SpotlightSession[]): string | null {
  if (sessions.length === 0) return null;
  const counts = new Map<number, number>();
  for (const session of sessions) {
    const day = new Date(session.played_at).getDay();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  // Een willekeurige datum met de juiste weekdag: 4 jan 2026 was een zondag.
  return format(new Date(2026, 0, 4 + top[0]), "EEEE", { locale: nl });
}

// ─── Kaart: revanche ──────────────────────────────────────────────────────────

/** Het spelerspaar dat het vaakst samen aan tafel zat. */
function busiestPair(
  sessions: SpotlightSession[],
  players: SpotlightPlayer[]
): [SpotlightPlayer, SpotlightPlayer] | null {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const ids = participantIds(session);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i] as string, ids[j] as string);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  if (!bestKey) return null;

  const [first, second] = bestKey.split("|");
  const a = players.find((player) => player.id === first);
  const b = players.find((player) => player.id === second);
  return a && b ? [a, b] : null;
}

function toDuelSession(session: SpotlightSession): DuelSession {
  return {
    id: session.id,
    played_at: session.played_at,
    winner_id: session.winner_id,
    game: session.game,
    scores: session.scores.map((entry) => ({
      player_id: entry.player.id,
      score: entry.score,
    })),
  };
}

/**
 * Waar valt er iets recht te zetten? Kijkt naar het drukste spelerspaar, zoekt de speler
 * die achterstaat en toont het spel waar die het hardst verliest — met een knop om er
 * meteen aan te beginnen.
 */
export function buildRevancheCard(
  sessions: SpotlightSession[],
  players: SpotlightPlayer[]
): SpotlightCard | null {
  const pair = busiestPair(sessions, players);
  if (!pair) return null;

  const ordered = newestFirst(sessions).map(toDuelSession);
  const [first, second] = pair;

  // Eerst kijken wie achterstaat; daarna de stand nog eens vanuit die speler bekijken,
  // want computeHeadToHead geeft de nemesis van de eerste speler.
  const provisional = computeHeadToHead(ordered, first.id, second.id);
  const [trailing, leading] =
    provisional.aWins <= provisional.bWins ? [first, second] : [second, first];
  const h2h = computeHeadToHead(ordered, trailing.id, leading.id);

  const nemesis = h2h.nemesisForA;
  if (!nemesis || nemesis.aWins >= nemesis.bWins) return null;

  const game = sessions.find((session) => session.game.id === nemesis.game.id)?.game;
  if (!game) return null;

  const entries: SpotlightEntry[] = [
    factEntry(
      nemesis.game.emoji,
      nemesis.game.name,
      `${trailing.emoji} ${trailing.name} won hier ${nemesis.aWins} van de ${nemesis.total} potjes`,
      game
    ),
  ];

  if (h2h.biggestMargin && h2h.biggestMargin.winner === "b") {
    entries.push(
      factEntry(
        "💥",
        `Grootste tik: ${h2h.biggestMargin.margin} punten`,
        `${h2h.biggestMargin.game.emoji} ${h2h.biggestMargin.game.name} · ${formatShortDate(
          h2h.biggestMargin.played_at
        )}`
      )
    );
  }

  return {
    id: "revanche",
    emoji: "⚔️",
    title: "Tijd voor revanche",
    tone: "lavender",
    entries,
    footnote: `Onderling: ${leading.emoji} ${leading.name} ${h2h.bWins} – ${h2h.aWins} ${trailing.emoji} ${trailing.name}${
      h2h.draws > 0 ? ` (${h2h.draws} gelijk)` : ""
    }`,
  };
}

// ─── Kaart: jaaroverzicht-teaser ──────────────────────────────────────────────

/**
 * In december (en in januari voor het jaar dat net afliep) een zetje naar /wrapped.
 * Buiten die maanden bestaat de kaart niet — dat is precies de bedoeling van variatie.
 */
export function buildWrappedTeaserCard(
  sessions: SpotlightSession[],
  today: Date
): SpotlightCard | null {
  const month = today.getMonth();
  if (month !== 11 && month !== 0) return null;
  const year = month === 11 ? today.getFullYear() : today.getFullYear() - 1;

  const ofYear = sessions.filter(
    (session) => new Date(session.played_at).getFullYear() === year
  );
  if (ofYear.length === 0) return null;

  const wins = new Map<string, { player: SpotlightPlayer; wins: number }>();
  for (const session of ofYear) {
    const winner = session.winner;
    if (!winner) continue;
    const row = wins.get(winner.id) ?? { player: winner, wins: 0 };
    row.wins++;
    wins.set(winner.id, row);
  }
  const leader = [...wins.values()].sort((a, b) => b.wins - a.wins)[0];

  const entries: SpotlightEntry[] = [
    factEntry("🎲", `${ofYear.length} potjes in ${year}`, "Het hele jaar op één rij"),
  ];
  if (leader) {
    entries.push(
      factEntry(
        leader.player.emoji,
        `${leader.player.name} leidt met ${leader.wins} ${
          leader.wins === 1 ? "winst" : "winsten"
        }`,
        `Beste jaar van ${leader.player.name}?`
      )
    );
  }

  return {
    id: `wrapped-${year}`,
    emoji: "🎁",
    title: "Jullie jaar in cijfers",
    tone: "yellow",
    entries,
    cta: { href: `/wrapped/${year}`, label: `🎁 Bekijk ${year}` },
  };
}

// ─── Samenstellen en kiezen ───────────────────────────────────────────────────

function newestFirst(sessions: SpotlightSession[]): SpotlightSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  );
}

/** Alle kaarten waarvoor genoeg gegevens zijn, in vaste volgorde van belangrijkheid. */
export function buildSpotlightCards(input: {
  sessions: SpotlightSession[];
  games: SpotlightGame[];
  players: SpotlightPlayer[];
  today: Date;
}): SpotlightCard[] {
  const { sessions, games, players, today } = input;

  return [
    buildWrappedTeaserCard(sessions, today),
    ...buildMemoryCards(sessions, today),
    buildRecentCard(sessions),
    buildRevancheCard(sessions, players),
    buildStreakCard(sessions, players),
    buildRecordCard(sessions),
    buildRhythmCard(sessions, today),
    buildDustCard(games, sessions, today),
  ].filter((card): card is SpotlightCard => card !== null);
}

/**
 * De selectie voor dit bezoek: maximaal MAX_SPOTLIGHT_CARDS kaarten, met een startpunt dat
 * met `seed` meeschuift. Twee keer de app openen geeft dus een andere mix, terwijl een
 * terugblik altijd meedoet zolang die bestaat — dat is het kaartje waar het om begon.
 */
export function pickSpotlightCards(
  cards: SpotlightCard[],
  seed: number
): SpotlightCard[] {
  if (cards.length <= MAX_SPOTLIGHT_CARDS) return cards;

  const offset = ((Math.trunc(seed) % cards.length) + cards.length) % cards.length;
  const rotated = [...cards.slice(offset), ...cards.slice(0, offset)];
  const picked = rotated.slice(0, MAX_SPOTLIGHT_CARDS);

  if (!picked.some((card) => card.id.startsWith("memory-"))) {
    const memory = rotated.find((card) => card.id.startsWith("memory-"));
    if (memory) {
      picked.pop();
      picked.unshift(memory);
    }
  }

  return picked;
}

// ─── Kaart bij een gekozen spel ───────────────────────────────────────────────

export type GameRecapStanding = {
  player: SpotlightPlayer;
  wins: number;
  played: number;
  winPercentage: number;
};

export type GameRecap = {
  game: SpotlightGame;
  totalSessions: number;
  lastPlayedAt: string | null;
  /** Gemiddelde speelduur in minuten, voor zover ingevuld. */
  avgDurationMinutes: number | null;
  /** Onderlinge stand voor dit spel, beste eerst. */
  standings: GameRecapStanding[];
  /** Record voor dit spel: hoogste score, of de laagste als laagste wint. */
  record: {
    score: number;
    player: SpotlightPlayer;
    played_at: string;
    lowestWins: boolean;
  } | null;
  /** De laatste potjes, als kaartregels. */
  entries: SpotlightEntry[];
};

/** Hoeveel van de laatste potjes de kaart bij een gekozen spel laat zien. */
export const GAME_RECAP_SESSIONS = 5;

/**
 * Zodra er een spel gekozen is, is een terugblik van twee jaar terug niet meer wat je wil
 * weten — dit is het: hoe liepen de laatste potjes, wie staat voor, en wat is het record.
 *
 * `sessions` zijn alle potjes van dít spel; de stand en het record gaan over alles, de
 * uitslagenlijst over de laatste GAME_RECAP_SESSIONS.
 */
export function computeGameRecap(
  sessions: SpotlightSession[],
  game: SpotlightGame,
  players: SpotlightPlayer[]
): GameRecap {
  const ordered = newestFirst(sessions);

  const durations = ordered
    .map((session) => session.duration_minutes)
    .filter((minutes): minutes is number => minutes !== null && minutes > 0);

  const standings = players
    .map((player) => {
      const mine = ordered.filter((session) =>
        participantIds(session).includes(player.id)
      );
      const wins = mine.filter((session) => session.winner_id === player.id).length;
      return {
        player,
        wins,
        played: mine.length,
        winPercentage: mine.length > 0 ? Math.round((wins / mine.length) * 100) : 0,
      };
    })
    .filter((row) => row.played > 0)
    .sort((a, b) => b.wins - a.wins || b.winPercentage - a.winPercentage);

  let record: GameRecap["record"] = null;
  for (const session of ordered) {
    for (const entry of session.scores) {
      if (entry.score === null) continue;
      const better =
        record !== null &&
        (game.lowest_score_wins ? entry.score < record.score : entry.score > record.score);
      if (record === null || better) {
        record = {
          score: entry.score,
          player: entry.player,
          played_at: session.played_at,
          lowestWins: game.lowest_score_wins,
        };
      }
    }
  }

  return {
    game,
    totalSessions: ordered.length,
    lastPlayedAt: ordered[0]?.played_at ?? null,
    avgDurationMinutes:
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null,
    standings,
    record,
    entries: ordered.slice(0, GAME_RECAP_SESSIONS).map(sessionEntry),
  };
}
