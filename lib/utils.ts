import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  getYear,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";
import { nl } from "date-fns/locale";
import type { PeriodFilter } from "@/lib/schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Haalt de Nederlandse foutmelding uit een mislukte API-respons.
 *
 * De routes geven bij een fout `{ error: "..." }` terug. Formulieren toonden dat niet
 * en zeiden altijd "Er ging iets mis", waardoor een dubbele spelnaam of een geweigerde
 * insert niet van elkaar te onderscheiden was.
 */
export async function apiErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  } catch {
    // Geen JSON in de respons — val terug op de algemene tekst.
  }
  return "Er ging iets mis. Probeer opnieuw.";
}

/** Format a date string for display in Dutch */
export function formatDate(dateString: string): string {
  return format(new Date(dateString), "d MMMM yyyy", { locale: nl });
}

/** Format a date string as short date in Dutch */
export function formatShortDate(dateString: string): string {
  return format(new Date(dateString), "d MMM", { locale: nl });
}

/** Get day of week (0=Sunday) from a Date */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * A session as the streak helpers see it. `player_ids` is optional so callers that only
 * pass sessions the player took part in keep working; when it is present, sessions the
 * player sat out are skipped instead of breaking the streak.
 */
type StreakSession = { winner_id: string | null; player_ids?: string[] };

/** Did the player take part? Sessions without participation data count as "yes". */
function tookPart(session: StreakSession, playerId: string): boolean {
  return session.player_ids ? session.player_ids.includes(playerId) : true;
}

/**
 * Calculate current win streak for a player.
 * sessions must be sorted by played_at DESC (newest first).
 * Returns number of consecutive wins at the start of the list.
 *
 * A session the player did not take part in is skipped, not counted as a loss — sitting
 * out someone else's game does not end your streak.
 */
export function calculateCurrentStreak(
  sessions: StreakSession[],
  playerId: string
): number {
  let streak = 0;
  for (const session of sessions) {
    if (!tookPart(session, playerId)) continue;
    if (session.winner_id === playerId) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate longest win streak for a player from a list of all sessions.
 * sessions must be sorted by played_at ASC (oldest first).
 *
 * Sessions the player sat out are skipped, same as in calculateCurrentStreak.
 */
export function calculateLongestStreak(
  sessions: StreakSession[],
  playerId: string
): number {
  let longest = 0;
  let current = 0;
  for (const session of sessions) {
    if (!tookPart(session, playerId)) continue;
    if (session.winner_id === playerId) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

/** Get date range for a period filter */
export function getPeriodDateRange(
  period: PeriodFilter
): { from: string; to: string } | null {
  const now = new Date();
  if (period === "all") return null;
  if (period === "today") {
    return {
      from: startOfDay(now).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  }
  if (period === "this_week") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    };
  }
  if (period === "this_season") {
    // Seizoenen zijn kwartalen — zie lib/seasons.ts.
    return {
      from: startOfQuarter(now).toISOString(),
      to: endOfQuarter(now).toISOString(),
    };
  }
  if (period === "this_year") {
    return {
      from: startOfYear(now).toISOString(),
      to: endOfYear(now).toISOString(),
    };
  }
  // last_year
  const lastYear = new Date(getYear(now) - 1, 0, 1);
  return {
    from: startOfYear(lastYear).toISOString(),
    to: endOfYear(lastYear).toISOString(),
  };
}
