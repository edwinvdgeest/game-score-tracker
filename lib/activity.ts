import { addDays, format, startOfDay, startOfWeek, subWeeks } from "date-fns";

/** Eén dag in het activiteitenraster. */
export type ActivityDay = {
  /** yyyy-MM-dd, lokale kalenderdag. */
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** Ligt na de opgegeven `endDate` — hoort nog bij de huidige week maar is nog niet gespeeld. */
  isFuture: boolean;
};

export type ActivityWeek = ActivityDay[];

/** Groepeert `played_at`-timestamps per lokale kalenderdag (yyyy-MM-dd). */
export function countSessionsByDate(playedAtDates: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const iso of playedAtDates) {
    const key = format(new Date(iso), "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Kleurniveau (0-4) relatief aan de drukste dag in het raster, net als GitHub's
 * contributiegrafiek. Bij `maxCount === 0` (nog nergens gespeeld) is elke dag niveau 0.
 */
export function activityLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/**
 * Bouwt een GitHub-achtig activiteitenraster: `weeks` weken van zondag t/m zaterdag,
 * eindigend in de kalenderweek van `endDate`. Dagen na `endDate` krijgen `isFuture: true`
 * zodat de rest van de huidige week als lege plekhouder getekend kan worden in plaats van
 * als "niet gespeeld".
 */
export function buildActivityWeeks(
  counts: Map<string, number>,
  endDate: Date,
  weeks = 53
): { weeks: ActivityWeek[]; maxCount: number } {
  const maxCount = Math.max(0, ...counts.values());
  const today = startOfDay(endDate);
  const lastWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  const firstWeekStart = subWeeks(lastWeekStart, weeks - 1);

  const result: ActivityWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const week: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(firstWeekStart, w * 7 + d);
      const key = format(day, "yyyy-MM-dd");
      const count = counts.get(key) ?? 0;
      week.push({
        date: key,
        count,
        level: activityLevel(count, maxCount),
        isFuture: day > today,
      });
    }
    result.push(week);
  }
  return { weeks: result, maxCount };
}
