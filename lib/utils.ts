import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, getYear, startOfYear, endOfYear } from "date-fns";
import { nl } from "date-fns/locale";
import type { PeriodFilter } from "@/lib/schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Calculate current win streak for a player.
 * sessions must be sorted by played_at DESC (newest first).
 * Returns number of consecutive wins at the start of the list.
 */
export function calculateCurrentStreak(
  sessions: Array<{ winner_id: string }>,
  playerId: string
): number {
  let streak = 0;
  for (const session of sessions) {
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
 */
export function calculateLongestStreak(
  sessions: Array<{ winner_id: string }>,
  playerId: string
): number {
  let longest = 0;
  let current = 0;
  for (const session of sessions) {
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
