import {
  endOfQuarter,
  getQuarter,
  getYear,
  startOfQuarter,
  format,
} from "date-fns";
import { nl } from "date-fns/locale";
import type { Player } from "@/lib/schemas";

/**
 * Seizoenen zijn kwartalen, afgeleid uit played_at — er staat geen season_id op een
 * sessie. Twee redenen: played_at is bewerkbaar in /history, dus een gedenormaliseerde
 * verwijzing zou onmiddellijk uit sync lopen; en de bestaande historie valt zo gratis in
 * het juiste kwartaal, zonder backfill en zonder risico.
 *
 * Kwartalen, niet maanden of jaren: met een paar honderd potjes over een paar jaar is een
 * kwartaal genoeg voor een zinnige stand, en het geeft vier kampioensmomenten per jaar.
 */

export type SeasonRef = { year: number; quarter: number };

export type SeasonSession = {
  id: string;
  played_at: string;
  winner_id: string | null;
  player_ids: string[];
};

export type SeasonStanding = {
  player: Player;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
};

/** Punten: winst 3, gelijkspel 1, verlies 0. */
export const POINTS_WIN = 3;
export const POINTS_DRAW = 1;

/** In welk seizoen valt dit moment? */
export function seasonOf(playedAt: string | Date): SeasonRef {
  const date = typeof playedAt === "string" ? new Date(playedAt) : playedAt;
  return { year: getYear(date), quarter: getQuarter(date) };
}

/** Begin en eind van een seizoen als ISO-strings. */
export function seasonRange(ref: SeasonRef): { from: string; to: string } {
  // De eerste maand van het kwartaal: Q1 → januari, Q2 → april, enzovoort.
  const anchor = new Date(ref.year, (ref.quarter - 1) * 3, 1);
  return {
    from: startOfQuarter(anchor).toISOString(),
    to: endOfQuarter(anchor).toISOString(),
  };
}

/** Bijvoorbeeld "Q3 2026 · jul–sep". */
export function seasonLabel(ref: SeasonRef): string {
  const anchor = new Date(ref.year, (ref.quarter - 1) * 3, 1);
  const first = format(startOfQuarter(anchor), "LLL", { locale: nl });
  const last = format(endOfQuarter(anchor), "LLL", { locale: nl });
  return `Q${ref.quarter} ${ref.year} · ${first}–${last}`;
}

/** Kort label, voor een kaartje of een dropdown. */
export function seasonShortLabel(ref: SeasonRef): string {
  return `Q${ref.quarter} ${ref.year}`;
}

export function isSameSeason(a: SeasonRef, b: SeasonRef): boolean {
  return a.year === b.year && a.quarter === b.quarter;
}

/** Nieuwste seizoen eerst. */
export function compareSeasonsDesc(a: SeasonRef, b: SeasonRef): number {
  return b.year - a.year || b.quarter - a.quarter;
}

/** Alle seizoenen waarin daadwerkelijk gespeeld is, nieuwste eerst. */
export function seasonsWithSessions(sessions: SeasonSession[]): SeasonRef[] {
  const seen = new Map<string, SeasonRef>();
  for (const session of sessions) {
    const ref = seasonOf(session.played_at);
    seen.set(`${ref.year}-${ref.quarter}`, ref);
  }
  return [...seen.values()].sort(compareSeasonsDesc);
}

/**
 * De stand van een seizoen.
 *
 * Punten alleen voor wie meedeed — dat komt uit player_ids, dezelfde definitie van
 * deelname als het scorebord gebruikt. Gasten horen hier niet in; die filtert de
 * aanroeper eruit.
 *
 * Sorteert op punten, dan wins, dan het aantal gespeelde potjes. De onderlinge stand als
 * tiebreak zit hier bewust niet in: die vraagt de duel-berekening en dus een tweede
 * datalaag. Bij gelijke punten en gelijke wins is "wie speelde er meer" een eerlijke en
 * uitlegbare knoop.
 */
export function computeStandings(
  sessions: SeasonSession[],
  players: Player[]
): SeasonStanding[] {
  return players
    .map((player) => {
      const mine = sessions.filter((s) => s.player_ids.includes(player.id));
      const wins = mine.filter((s) => s.winner_id === player.id).length;
      const draws = mine.filter((s) => s.winner_id === null).length;
      const losses = mine.length - wins - draws;

      return {
        player,
        points: wins * POINTS_WIN + draws * POINTS_DRAW,
        wins,
        draws,
        losses,
        played: mine.length,
      };
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.played - a.played);
}

/**
 * De kampioen van een stand, of null bij een gedeelde eerste plek of zonder potjes.
 */
export function championOf(standings: SeasonStanding[]): SeasonStanding | null {
  const first = standings[0];
  if (!first || first.played === 0) return null;
  const second = standings[1];
  if (second && second.points === first.points && second.wins === first.wins) {
    return null;
  }
  return first;
}
