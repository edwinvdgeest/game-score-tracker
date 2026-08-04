import { describe, it, expect } from "vitest";
import { activityLevel, buildActivityWeeks, countSessionsByDate } from "@/lib/activity";

describe("countSessionsByDate", () => {
  it("groepeert timestamps per kalenderdag", () => {
    const counts = countSessionsByDate([
      "2026-08-04T18:00:00.000Z",
      "2026-08-04T20:30:00.000Z",
      "2026-08-05T18:00:00.000Z",
    ]);
    expect(counts.get("2026-08-04")).toBe(2);
    expect(counts.get("2026-08-05")).toBe(1);
    expect(counts.size).toBe(2);
  });

  it("geeft een lege map voor geen sessies", () => {
    expect(countSessionsByDate([]).size).toBe(0);
  });
});

describe("activityLevel", () => {
  it("is 0 zonder potjes of zonder maximum", () => {
    expect(activityLevel(0, 5)).toBe(0);
    expect(activityLevel(3, 0)).toBe(0);
  });

  it("schaalt naar 4 kwartielen van het maximum", () => {
    expect(activityLevel(1, 4)).toBe(1);
    expect(activityLevel(2, 4)).toBe(2);
    expect(activityLevel(3, 4)).toBe(3);
    expect(activityLevel(4, 4)).toBe(4);
  });
});

describe("buildActivityWeeks", () => {
  it("bouwt het gevraagde aantal weken van 7 dagen", () => {
    const { weeks } = buildActivityWeeks(new Map(), new Date("2026-08-04T12:00:00Z"), 10);
    expect(weeks).toHaveLength(10);
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  it("eindigt in de kalenderweek van endDate, oudste week eerst", () => {
    // 4 augustus 2026 is een dinsdag; de week (zondag-start) begint op 2 augustus.
    const { weeks } = buildActivityWeeks(new Map(), new Date("2026-08-04T12:00:00Z"), 2);
    const lastWeek = weeks[weeks.length - 1]!;
    expect(lastWeek[0]!.date).toBe("2026-08-02");
    expect(lastWeek[6]!.date).toBe("2026-08-08");
  });

  it("markeert dagen na endDate als isFuture, zonder ze over te slaan", () => {
    const { weeks } = buildActivityWeeks(new Map(), new Date("2026-08-04T12:00:00Z"), 1);
    const week = weeks[0]!;
    const byDate = new Map(week.map((d) => [d.date, d]));
    expect(byDate.get("2026-08-04")?.isFuture).toBe(false);
    expect(byDate.get("2026-08-05")?.isFuture).toBe(true);
    expect(byDate.get("2026-08-08")?.isFuture).toBe(true);
  });

  it("kent elke dag het juiste niveau toe, relatief aan het drukste dag", () => {
    const counts = new Map([
      ["2026-08-03", 1],
      ["2026-08-04", 4],
    ]);
    const { weeks, maxCount } = buildActivityWeeks(
      counts,
      new Date("2026-08-04T12:00:00Z"),
      1
    );
    expect(maxCount).toBe(4);
    const byDate = new Map(weeks[0]!.map((d) => [d.date, d]));
    expect(byDate.get("2026-08-03")?.level).toBe(1);
    expect(byDate.get("2026-08-04")?.level).toBe(4);
    expect(byDate.get("2026-08-06")?.count).toBe(0);
    expect(byDate.get("2026-08-06")?.level).toBe(0);
  });
});
