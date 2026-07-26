/**
 * Head-to-head: de onderlinge stand tussen twee spelers.
 *
 * De beslisregel is paarsgewijs op score, met winner_id als terugvaloptie. Dat is
 * belangrijker dan het lijkt: in een potje met drie spelers kan Edwin Lisanne verslaan
 * terwijl Minou de sessie wint. "Wie won de sessie" zou dat feit weggooien, en juist dat
 * is de rivaliteit die je wil zien. Bij de twee-mans-potjes die het gros van de historie
 * vormen valt score-vergelijking samen met winner_id, dus de bestaande stand verandert
 * niet — hij wordt alleen robuust voor drie of meer spelers.
 */

export type DuelSession = {
  id: string;
  played_at: string;
  game: { id: string; name: string; emoji: string; lowest_score_wins: boolean };
  winner_id: string | null;
  /** Scores van alle deelnemers aan dit potje. */
  scores: Array<{ player_id: string; score: number | null }>;
};

export type DuelOutcome = "a" | "b" | "draw";

export type DuelGameRecord = {
  game: { id: string; name: string; emoji: string };
  aWins: number;
  bWins: number;
  draws: number;
  total: number;
};

export type BiggestMargin = {
  margin: number;
  played_at: string;
  game: { id: string; name: string; emoji: string };
  /** Wie de marge maakte: 'a' of 'b'. */
  winner: "a" | "b";
};

export type HeadToHead = {
  aWins: number;
  bWins: number;
  draws: number;
  /** Aantal potjes waarin beide spelers meededen. */
  total: number;
  perGame: DuelGameRecord[];
  /** Spel waar speler A het vaakst tegen B verliest (min. MIN_NEMESIS_SESSIONS potjes). */
  nemesisForA: DuelGameRecord | null;
  biggestMargin: BiggestMargin | null;
  /** Huidige onderlinge reeks van A, negatief als B aan de leiding staat. */
  currentStreakA: number;
  longestStreakA: number;
  longestStreakB: number;
};

/** Onder dit aantal gedeelde potjes zegt een nemesis-percentage niets. */
export const MIN_NEMESIS_SESSIONS = 3;

/** Stabiele sleutel voor een spelerspaar, ongeacht de volgorde. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/**
 * Wie won dit potje onderling?
 *
 * Zijn beide scores ingevuld, dan vergelijken we die (en respecteren we
 * lowest_score_wins). Ontbreekt er een score, dan valt het terug op de sessiewinnaar.
 * Won een derde speler de sessie, dan is het onderling een remise — zonder scores is er
 * niets om deze twee op te vergelijken.
 */
export function decidePair(
  session: DuelSession,
  playerA: string,
  playerB: string
): DuelOutcome {
  const entryA = session.scores.find((s) => s.player_id === playerA);
  const entryB = session.scores.find((s) => s.player_id === playerB);

  if (entryA?.score != null && entryB?.score != null) {
    if (entryA.score === entryB.score) return "draw";
    const aIsHigher = entryA.score > entryB.score;
    const aWins = session.game.lowest_score_wins ? !aIsHigher : aIsHigher;
    return aWins ? "a" : "b";
  }

  if (session.winner_id === playerA) return "a";
  if (session.winner_id === playerB) return "b";
  return "draw";
}

/** Deden beide spelers mee aan dit potje? */
function isShared(session: DuelSession, playerA: string, playerB: string): boolean {
  const ids = new Set(session.scores.map((s) => s.player_id));
  return ids.has(playerA) && ids.has(playerB);
}

/**
 * De volledige onderlinge stand.
 *
 * `sessions` mag alle potjes bevatten; wat niet gedeeld is wordt genegeerd. De volgorde
 * moet nieuwste-eerst zijn, zoals de queries hem opleveren.
 */
export function computeHeadToHead(
  sessions: DuelSession[],
  playerA: string,
  playerB: string
): HeadToHead {
  const shared = sessions.filter((s) => isShared(s, playerA, playerB));
  const outcomes = shared.map((session) => ({
    session,
    outcome: decidePair(session, playerA, playerB),
  }));

  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  const perGameMap = new Map<string, DuelGameRecord>();
  let biggestMargin: BiggestMargin | null = null;

  for (const { session, outcome } of outcomes) {
    if (outcome === "a") aWins++;
    else if (outcome === "b") bWins++;
    else draws++;

    const record = perGameMap.get(session.game.id) ?? {
      game: {
        id: session.game.id,
        name: session.game.name,
        emoji: session.game.emoji,
      },
      aWins: 0,
      bWins: 0,
      draws: 0,
      total: 0,
    };
    if (outcome === "a") record.aWins++;
    else if (outcome === "b") record.bWins++;
    else record.draws++;
    record.total++;
    perGameMap.set(session.game.id, record);

    // Grootste marge: alleen te bepalen als beide scores er zijn.
    const scoreA = session.scores.find((s) => s.player_id === playerA)?.score;
    const scoreB = session.scores.find((s) => s.player_id === playerB)?.score;
    if (scoreA != null && scoreB != null && outcome !== "draw") {
      const margin = Math.abs(scoreA - scoreB);
      if (margin > 0 && (!biggestMargin || margin > biggestMargin.margin)) {
        biggestMargin = {
          margin,
          played_at: session.played_at,
          game: {
            id: session.game.id,
            name: session.game.name,
            emoji: session.game.emoji,
          },
          winner: outcome,
        };
      }
    }
  }

  const perGame = [...perGameMap.values()].sort((x, y) => y.total - x.total);

  // Nemesis van A: waar A het laagste aandeel onderlinge winsten heeft. Remises tellen
  // in de noemer mee, want ze zijn geen winst.
  const nemesisCandidates = perGame.filter(
    (record) => record.total >= MIN_NEMESIS_SESSIONS
  );
  const nemesisForA =
    nemesisCandidates.length > 0
      ? nemesisCandidates.reduce((worst, record) =>
          record.aWins / record.total < worst.aWins / worst.total ? record : worst
        )
      : null;

  // Reeksen. outcomes staat nieuwste-eerst.
  let currentStreakA = 0;
  for (const { outcome } of outcomes) {
    if (outcome === "draw") break;
    if (currentStreakA === 0) {
      currentStreakA = outcome === "a" ? 1 : -1;
    } else if (outcome === "a" && currentStreakA > 0) {
      currentStreakA++;
    } else if (outcome === "b" && currentStreakA < 0) {
      currentStreakA--;
    } else {
      break;
    }
  }

  let longestStreakA = 0;
  let longestStreakB = 0;
  let runA = 0;
  let runB = 0;
  for (const { outcome } of outcomes) {
    if (outcome === "a") {
      runA++;
      runB = 0;
      if (runA > longestStreakA) longestStreakA = runA;
    } else if (outcome === "b") {
      runB++;
      runA = 0;
      if (runB > longestStreakB) longestStreakB = runB;
    } else {
      runA = 0;
      runB = 0;
    }
  }

  return {
    aWins,
    bWins,
    draws,
    total: shared.length,
    perGame,
    nemesisForA,
    biggestMargin,
    currentStreakA,
    longestStreakA,
    longestStreakB,
  };
}
