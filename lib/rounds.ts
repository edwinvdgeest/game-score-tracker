import type { Game } from "@/lib/schemas";

/**
 * De rondevormen die een spel kan hebben (migratie 014).
 *
 * Nederlandse waarden, net als game_category en text_source: die staan zo in de database
 * en half vertalen is erger dan niet vertalen.
 */
export type RoundFormat = "geen" | "vast" | "grens" | "vrij" | "winnaar";

export const ROUND_FORMATS: RoundFormat[] = ["geen", "vast", "grens", "vrij", "winnaar"];

/** Labels voor de spelformulieren. Gedeeld zodat add en edit niet uiteen kunnen lopen. */
export const ROUND_FORMAT_LABELS: Record<RoundFormat, string> = {
  geen: "Geen rondes — één eindscore",
  vast: "Vast aantal rondes",
  grens: "Spelen tot een grens",
  vrij: "Vrij aantal rondes",
  winnaar: "Rondes met een winnaar",
};

/** Eén regeltje uitleg onder de keuze, zodat je niet hoeft te gokken wat een vorm doet. */
export const ROUND_FORMAT_HINTS: Record<RoundFormat, string> = {
  geen: "Zoals nu: je vult één score per speler in.",
  vast: "Bijv. Skull King: altijd 10 rondes, het totaal is de som.",
  grens: "Bijv. Take 5: doorspelen tot iemand de grens haalt.",
  vrij: "Zoveel rondes als je wil — je drukt zelf op klaar.",
  winnaar: "Geen punten; wie de meeste rondes wint, wint het potje.",
};

/** Eén regel uit session_rounds: wat één speler in één ronde deed. */
export type RoundEntry = {
  round_number: number;
  player_id: string;
  score: number | null;
};

/** De rondeconfiguratie van een spel, losgetrokken van Game zodat dit puur testbaar is. */
export type RoundConfig = {
  format: RoundFormat;
  /** Alleen bij 'vast'. */
  count: number | null;
  /** Alleen bij 'grens'. */
  target: number | null;
};

/** Velden van een spel die de rondeconfiguratie bepalen. */
type RoundFields = Pick<Game, "round_format" | "round_count" | "round_target">;

/**
 * Leest de rondeconfiguratie uit een spel.
 *
 * Een spel uit een cache van vóór migratie 014 heeft de kolommen niet; dat valt terug op
 * 'geen', en dan gedraagt de app zich precies zoals voorheen.
 */
export function roundConfigOf(game: Partial<RoundFields> | null | undefined): RoundConfig {
  return {
    format: game?.round_format ?? "geen",
    count: game?.round_count ?? null,
    target: game?.round_target ?? null,
  };
}

/** Speelt dit spel in rondes? */
export function usesRounds(game: Partial<RoundFields> | null | undefined): boolean {
  return roundConfigOf(game).format !== "geen";
}

/**
 * Maakt de rondevelden onderling consistent voordat ze de database in gaan.
 *
 * Twee dingen: het veld dat bij de gekozen vorm niet hoort wordt genuld (anders blijft er
 * een grens van 66 staan bij een spel dat inmiddels een vast aantal rondes heeft), en bij
 * 'winnaar' gaat lowest_score_wins verplicht uit — daar is de score het aantal gewonnen
 * rondes, en "laagste wint" zou de winnaar omdraaien. De database bewaakt dat laatste ook
 * met games_winnaar_not_lowest; deze functie zorgt dat je die constraint nooit raakt.
 */
export function normalizeRoundConfig<
  T extends Partial<RoundFields> & { lowest_score_wins?: boolean },
>(input: T): T {
  const format = input.round_format;
  if (format === undefined) return input;

  return {
    ...input,
    round_count: format === "vast" ? (input.round_count ?? null) : null,
    round_target: format === "grens" ? (input.round_target ?? null) : null,
    lowest_score_wins: format === "winnaar" ? false : input.lowest_score_wins,
  };
}

/**
 * Ruwe invoer van het rondescherm naar rijen.
 *
 * `raw[i]` is ronde i+1 en bevat per speler-id de ingetikte tekst. Symmetrisch met
 * parseScoreEntries in lib/stats.ts: leeg of onleesbaar wordt null, niet 0.
 */
export function parseRoundEntries(
  playerIds: string[],
  raw: Array<Record<string, string>>
): RoundEntry[] {
  return raw.flatMap((round, index) =>
    playerIds.map((player_id) => {
      const value = round[player_id]?.trim() ?? "";
      if (value === "") return { round_number: index + 1, player_id, score: null };
      const parsed = Number.parseInt(value, 10);
      return {
        round_number: index + 1,
        player_id,
        score: Number.isNaN(parsed) ? null : parsed,
      };
    })
  );
}

/**
 * Eindtotaal per speler: de som van de ronde-scores.
 *
 * Dit is de waarde die in session_players.score belandt en die dus alle statistieken
 * voedt. Een speler zonder ook maar één ingevulde ronde krijgt null en niet 0 — dezelfde
 * "niet ingevuld" als in parseScoreEntries, zodat computeWinner er hetzelfde mee omgaat.
 *
 * Geef een deelverzameling van `rounds` mee en je krijgt de tussenstand; daarom is er
 * geen aparte functie voor lopende totalen.
 */
export function sumRounds(
  playerIds: string[],
  rounds: RoundEntry[]
): Array<{ player_id: string; score: number | null }> {
  const totals = new Map<string, number | null>(playerIds.map((id) => [id, null]));

  for (const entry of rounds) {
    if (entry.score === null) continue;
    if (!totals.has(entry.player_id)) continue;
    totals.set(entry.player_id, (totals.get(entry.player_id) ?? 0) + entry.score);
  }

  return playerIds.map((player_id) => ({ player_id, score: totals.get(player_id) ?? null }));
}

/** Hoeveel rondes er gespeeld zijn — het hoogste rondenummer dat voorkomt. */
export function roundsPlayed(rounds: RoundEntry[]): number {
  return rounds.reduce((max, entry) => Math.max(max, entry.round_number), 0);
}

/**
 * Is het potje afgelopen? Alleen 'vast' en 'grens' weten dat zelf; bij 'vrij' en
 * 'winnaar' bepaalt de speler wanneer het klaar is.
 *
 * LET OP bij 'grens': de grens geldt op het HOOGSTE totaal, ongeacht lowest_score_wins.
 * Take 5 is precies dat geval — het potje stopt zodra iemand 66 haalt, en dan wint de
 * laagste score. Draai die vergelijking dus nooit om; lowest_score_wins hoort thuis bij
 * computeWinner en nergens anders.
 */
export function isSessionComplete(
  config: RoundConfig,
  totals: Array<{ player_id: string; score: number | null }>,
  played: number
): boolean {
  if (config.format === "vast") {
    return config.count !== null && played >= config.count;
  }
  if (config.format === "grens") {
    if (config.target === null) return false;
    return totals.some((t) => t.score !== null && t.score >= config.target!);
  }
  return false;
}

/** Wie is over de grens — voedt de ❗-markering in het rondescherm. */
export function playersOverTarget(
  config: RoundConfig,
  totals: Array<{ player_id: string; score: number | null }>
): string[] {
  if (config.format !== "grens" || config.target === null) return [];
  return totals
    .filter((t) => t.score !== null && t.score >= config.target!)
    .map((t) => t.player_id);
}

/**
 * Zijn dit dezelfde deelnemers met dezelfde scores? Volgorde-onafhankelijk.
 *
 * Bepaalt in updateSession of de rondes weggegooid moeten worden. Staat hier en niet in
 * queries.ts omdat rekenlogica volgens de huisregel testbaar hoort te zijn.
 */
export function sameParticipantScores(
  a: Array<{ player_id: string; score: number | null }>,
  b: Array<{ player_id: string; score: number | null }>
): boolean {
  if (a.length !== b.length) return false;
  const left = new Map(a.map((e) => [e.player_id, e.score ?? null]));
  return b.every(
    (entry) => left.has(entry.player_id) && left.get(entry.player_id) === (entry.score ?? null)
  );
}
