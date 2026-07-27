import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getPeriodDateRange,
} from "@/lib/utils";

describe("calculateCurrentStreak", () => {
  it("telt de wins vooraan de lijst", () => {
    expect(
      calculateCurrentStreak(
        [{ winner_id: "a" }, { winner_id: "a" }, { winner_id: "b" }],
        "a"
      )
    ).toBe(2);
  });

  it("is 0 als het nieuwste potje verloren is", () => {
    expect(
      calculateCurrentStreak([{ winner_id: "b" }, { winner_id: "a" }], "a")
    ).toBe(0);
  });

  it("breekt op een gelijkspel", () => {
    expect(
      calculateCurrentStreak([{ winner_id: null }, { winner_id: "a" }], "a")
    ).toBe(0);
  });

  it("slaat een potje over waar de speler niet meedeed", () => {
    expect(
      calculateCurrentStreak(
        [
          { winner_id: "a", player_ids: ["a", "b"] },
          { winner_id: "c", player_ids: ["b", "c"] },
          { winner_id: "a", player_ids: ["a", "b"] },
        ],
        "a"
      )
    ).toBe(2);
  });

  it("verlengt de reeks niet met een potje dat de speler niet meedeed", () => {
    expect(
      calculateCurrentStreak(
        [
          { winner_id: "c", player_ids: ["b", "c"] },
          { winner_id: "a", player_ids: ["a", "b"] },
        ],
        "a"
      )
    ).toBe(1);
  });
});

describe("calculateLongestStreak", () => {
  it("vindt de langste reeks ergens in de historie", () => {
    expect(
      calculateLongestStreak(
        [
          { winner_id: "a" },
          { winner_id: "b" },
          { winner_id: "a" },
          { winner_id: "a" },
          { winner_id: "a" },
          { winner_id: "b" },
        ],
        "a"
      )
    ).toBe(3);
  });

  it("slaat potjes over waar de speler niet meedeed", () => {
    expect(
      calculateLongestStreak(
        [
          { winner_id: "a", player_ids: ["a", "b"] },
          { winner_id: "c", player_ids: ["b", "c"] },
          { winner_id: "a", player_ids: ["a", "b"] },
        ],
        "a"
      )
    ).toBe(2);
  });

  it("is 0 zonder wins", () => {
    expect(calculateLongestStreak([{ winner_id: "b" }], "a")).toBe(0);
  });
});

describe("getPeriodDateRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Vaste datum: woensdag 15 juli 2026, 14:00 lokale tijd. */
  function freeze() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15, 14, 0, 0));
  }

  it("geeft null voor 'all' — geen filter", () => {
    freeze();
    expect(getPeriodDateRange("all")).toBeNull();
  });

  it("begrenst 'today' tot een enkele dag", () => {
    freeze();
    const range = getPeriodDateRange("today");
    expect(range).not.toBeNull();
    if (!range) return;
    expect(new Date(range.from).getDate()).toBe(15);
    expect(new Date(range.to).getDate()).toBe(15);
    expect(new Date(range.to).getTime()).toBeGreaterThan(
      new Date(range.from).getTime()
    );
  });

  it("laat 'this_week' op maandag beginnen", () => {
    freeze();
    const range = getPeriodDateRange("this_week");
    expect(range).not.toBeNull();
    if (!range) return;
    // Maandag 13 juli 2026.
    expect(new Date(range.from).getDay()).toBe(1);
    expect(new Date(range.from).getDate()).toBe(13);
  });

  it("begrenst 'this_season' tot het kwartaal", () => {
    freeze(); // 15 juli 2026 = Q3
    const range = getPeriodDateRange("this_season");
    expect(range).not.toBeNull();
    if (!range) return;
    expect(new Date(range.from).getMonth()).toBe(6); // juli
    expect(new Date(range.from).getDate()).toBe(1);
    expect(new Date(range.to).getMonth()).toBe(8); // september
    expect(new Date(range.to).getDate()).toBe(30);
  });

  it("dekt met 'this_year' het hele jaar", () => {
    freeze();
    const range = getPeriodDateRange("this_year");
    expect(range).not.toBeNull();
    if (!range) return;
    expect(new Date(range.from).getFullYear()).toBe(2026);
    expect(new Date(range.from).getMonth()).toBe(0);
    expect(new Date(range.to).getFullYear()).toBe(2026);
    expect(new Date(range.to).getMonth()).toBe(11);
  });

  it("pakt met 'last_year' het vorige jaar", () => {
    freeze();
    const range = getPeriodDateRange("last_year");
    expect(range).not.toBeNull();
    if (!range) return;
    expect(new Date(range.from).getFullYear()).toBe(2025);
    expect(new Date(range.to).getFullYear()).toBe(2025);
  });

  it("laat rond de jaarwisseling geen gat vallen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 0, 30, 0));
    const thisYear = getPeriodDateRange("this_year");
    const lastYear = getPeriodDateRange("last_year");
    expect(thisYear).not.toBeNull();
    expect(lastYear).not.toBeNull();
    if (!thisYear || !lastYear) return;
    expect(new Date(lastYear.to).getTime()).toBeLessThan(
      new Date(thisYear.from).getTime()
    );
  });
});
