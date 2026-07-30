import { describe, it, expect } from "vitest";
import {
  activeDemotions,
  clearDemotions,
  demoteKind,
  markHomeVisit,
  parsePrefs,
  restoreKind,
  visitedHomeToday,
  DEMOTE_DAYS,
  EMPTY_PREFS,
} from "@/lib/spotlight-prefs";

const NOW = new Date(2026, 6, 30, 12, 0, 0);

/** Datum N dagen na NOW. */
function daysLater(days: number): Date {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  return date;
}

describe("demoteKind", () => {
  it("zet een kaartsoort weg en houdt die 30 dagen weg", () => {
    const prefs = demoteKind(EMPTY_PREFS, "dust", NOW);

    expect(activeDemotions(prefs, NOW)).toEqual(["dust"]);
    expect(activeDemotions(prefs, daysLater(DEMOTE_DAYS - 1))).toEqual(["dust"]);
    expect(activeDemotions(prefs, daysLater(DEMOTE_DAYS + 1))).toEqual([]);
  });

  it("ruimt verlopen soorten op zodra er een nieuwe bijkomt", () => {
    const oud = demoteKind(EMPTY_PREFS, "dust", NOW);
    const nieuw = demoteKind(oud, "records", daysLater(DEMOTE_DAYS + 1));

    expect(Object.keys(nieuw.demoted)).toEqual(["records"]);
  });

  it("laat andere soorten staan", () => {
    const prefs = demoteKind(demoteKind(EMPTY_PREFS, "dust", NOW), "rhythm", NOW);
    expect(activeDemotions(prefs, NOW).sort()).toEqual(["dust", "rhythm"]);
  });
});

describe("restoreKind en clearDemotions", () => {
  it("zet één soort terug", () => {
    const prefs = demoteKind(demoteKind(EMPTY_PREFS, "dust", NOW), "rhythm", NOW);
    expect(activeDemotions(restoreKind(prefs, "dust"), NOW)).toEqual(["rhythm"]);
  });

  it("zet alles terug", () => {
    const prefs = demoteKind(demoteKind(EMPTY_PREFS, "dust", NOW), "rhythm", NOW);
    expect(activeDemotions(clearDemotions(prefs), NOW)).toEqual([]);
  });
});

describe("homepagebezoek", () => {
  it("weet of de homepage vandaag al open was", () => {
    const prefs = markHomeVisit(EMPTY_PREFS, NOW);

    expect(visitedHomeToday(prefs, NOW)).toBe(true);
    expect(visitedHomeToday(prefs, new Date(2026, 6, 30, 23, 59, 0))).toBe(true);
    expect(visitedHomeToday(prefs, daysLater(1))).toBe(false);
  });

  it("is onwaar zonder bezoek en bij een kapotte datum", () => {
    expect(visitedHomeToday(EMPTY_PREFS, NOW)).toBe(false);
    expect(visitedHomeToday({ demoted: {}, lastHomeVisit: "geen datum" }, NOW)).toBe(false);
  });
});

describe("parsePrefs", () => {
  it("leest wat er is opgeslagen", () => {
    const stored = JSON.stringify(markHomeVisit(demoteKind(EMPTY_PREFS, "dust", NOW), NOW));
    const prefs = parsePrefs(stored);

    expect(activeDemotions(prefs, NOW)).toEqual(["dust"]);
    expect(visitedHomeToday(prefs, NOW)).toBe(true);
  });

  it("valt terug op leeg bij niets, kapotte JSON of onzin", () => {
    expect(parsePrefs(null)).toEqual(EMPTY_PREFS);
    expect(parsePrefs("{niet eens json")).toEqual(EMPTY_PREFS);
    expect(parsePrefs('"een string"')).toEqual(EMPTY_PREFS);
    expect(parsePrefs("[1,2,3]")).toEqual({ demoted: {} });
  });

  it("negeert onbruikbare datums in de opslag", () => {
    const prefs = parsePrefs('{"demoted":{"dust":"weet ik niet","rhythm":5}}');
    expect(prefs.demoted).toEqual({});
  });
});
