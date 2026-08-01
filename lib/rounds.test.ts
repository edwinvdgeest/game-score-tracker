import { describe, it, expect } from "vitest";
import { computeWinner } from "./stats";
import {
  roundConfigOf,
  usesRounds,
  normalizeRoundConfig,
  parseRoundEntries,
  sumRounds,
  roundsPlayed,
  isSessionComplete,
  playersOverTarget,
  sameParticipantScores,
  type RoundConfig,
} from "./rounds";

const EDWIN = "edwin";
const LISANNE = "lisanne";
const IEDEREEN = [EDWIN, LISANNE];

function config(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return { format: "geen", count: null, target: null, ...overrides };
}

describe("roundConfigOf", () => {
  it("valt terug op 'geen' voor een spel van vóór de migratie", () => {
    expect(roundConfigOf({})).toEqual({ format: "geen", count: null, target: null });
    expect(roundConfigOf(null)).toEqual({ format: "geen", count: null, target: null });
  });

  it("leest de vorm en de bijbehorende instelling", () => {
    expect(roundConfigOf({ round_format: "grens", round_target: 66 })).toEqual({
      format: "grens",
      count: null,
      target: 66,
    });
  });

  it("weet welke spellen in rondes spelen", () => {
    expect(usesRounds({ round_format: "geen" })).toBe(false);
    expect(usesRounds({})).toBe(false);
    expect(usesRounds({ round_format: "vast", round_count: 10 })).toBe(true);
  });
});

describe("normalizeRoundConfig", () => {
  it("nult de instelling die niet bij de gekozen vorm hoort", () => {
    // Van "tot 66" naar "10 rondes": die 66 mag niet blijven rondslingeren.
    const result = normalizeRoundConfig({
      round_format: "vast" as const,
      round_count: 10,
      round_target: 66,
    });
    expect(result.round_count).toBe(10);
    expect(result.round_target).toBeNull();
  });

  it("zet lowest_score_wins uit bij de winnaar-vorm", () => {
    // De score is daar het aantal gewonnen rondes; "laagste wint" zou de winnaar omdraaien.
    const result = normalizeRoundConfig({
      round_format: "winnaar" as const,
      lowest_score_wins: true,
    });
    expect(result.lowest_score_wins).toBe(false);
  });

  it("laat lowest_score_wins met rust bij de andere vormen", () => {
    const result = normalizeRoundConfig({
      round_format: "grens" as const,
      round_target: 66,
      lowest_score_wins: true,
    });
    expect(result.lowest_score_wins).toBe(true);
    expect(result.round_target).toBe(66);
  });

  it("raakt niets aan als de vorm niet meegestuurd wordt", () => {
    // Een PATCH die alleen de naam wijzigt mag de rondeconfiguratie niet leegvegen.
    const input = { round_count: 10, round_target: 66, lowest_score_wins: true };
    expect(normalizeRoundConfig(input)).toEqual(input);
  });
});

describe("parseRoundEntries", () => {
  it("nummert vanaf 1 en maakt een rij per speler per ronde", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "10", [LISANNE]: "5" },
      { [EDWIN]: "3", [LISANNE]: "8" },
    ]);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({ round_number: 1, player_id: EDWIN, score: 10 });
    expect(entries[3]).toEqual({ round_number: 2, player_id: LISANNE, score: 8 });
  });

  it("maakt leeg of onleesbaar null, niet 0", () => {
    const entries = parseRoundEntries(IEDEREEN, [{ [EDWIN]: "", [LISANNE]: "abc" }]);
    expect(entries.every((e) => e.score === null)).toBe(true);
  });

  it("leest negatieve scores", () => {
    // Skull King: een misgelopen bod kost punten.
    const entries = parseRoundEntries([EDWIN], [{ [EDWIN]: "-30" }]);
    expect(entries[0]!.score).toBe(-30);
  });
});

describe("sumRounds", () => {
  it("telt de rondes per speler op", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "10", [LISANNE]: "5" },
      { [EDWIN]: "3", [LISANNE]: "8" },
      { [EDWIN]: "-4", [LISANNE]: "0" },
    ]);
    expect(sumRounds(IEDEREEN, entries)).toEqual([
      { player_id: EDWIN, score: 9 },
      { player_id: LISANNE, score: 13 },
    ]);
  });

  it("slaat lege rondes over maar telt de rest gewoon door", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "10", [LISANNE]: "" },
      { [EDWIN]: "5", [LISANNE]: "7" },
    ]);
    expect(sumRounds(IEDEREEN, entries)).toEqual([
      { player_id: EDWIN, score: 15 },
      { player_id: LISANNE, score: 7 },
    ]);
  });

  it("geeft null voor een speler zonder enkele ingevulde ronde", () => {
    // Niet 0: anders zou zo iemand bij "laagste wint" het potje winnen.
    const entries = parseRoundEntries(IEDEREEN, [{ [EDWIN]: "10", [LISANNE]: "" }]);
    const totals = sumRounds(IEDEREEN, entries);
    expect(totals.find((t) => t.player_id === LISANNE)!.score).toBeNull();
  });

  it("geeft alle spelers terug, ook zonder enkele ronde", () => {
    expect(sumRounds(IEDEREEN, [])).toEqual([
      { player_id: EDWIN, score: null },
      { player_id: LISANNE, score: null },
    ]);
  });

  it("negeert rijen van een speler die niet meer meedoet", () => {
    const entries = parseRoundEntries([EDWIN, "gast"], [{ [EDWIN]: "10", gast: "99" }]);
    expect(sumRounds([EDWIN], entries)).toEqual([{ player_id: EDWIN, score: 10 }]);
  });

  it("geeft de tussenstand voor een deelverzameling rondes", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "10", [LISANNE]: "5" },
      { [EDWIN]: "3", [LISANNE]: "8" },
    ]);
    const naEerste = entries.filter((e) => e.round_number <= 1);
    expect(sumRounds(IEDEREEN, naEerste)).toEqual([
      { player_id: EDWIN, score: 10 },
      { player_id: LISANNE, score: 5 },
    ]);
  });
});

describe("roundsPlayed", () => {
  it("telt het hoogste rondenummer", () => {
    const entries = parseRoundEntries(IEDEREEN, [{ [EDWIN]: "1" }, { [EDWIN]: "2" }]);
    expect(roundsPlayed(entries)).toBe(2);
    expect(roundsPlayed([])).toBe(0);
  });
});

describe("isSessionComplete", () => {
  const totals = (edwin: number | null, lisanne: number | null) => [
    { player_id: EDWIN, score: edwin },
    { player_id: LISANNE, score: lisanne },
  ];

  it("is bij een vast aantal pas klaar na de laatste ronde", () => {
    const vast = config({ format: "vast", count: 10 });
    expect(isSessionComplete(vast, totals(50, 40), 9)).toBe(false);
    expect(isSessionComplete(vast, totals(50, 40), 10)).toBe(true);
  });

  it("is bij een grens klaar zodra iemand die haalt", () => {
    const grens = config({ format: "grens", target: 66 });
    expect(isSessionComplete(grens, totals(65, 40), 5)).toBe(false);
    expect(isSessionComplete(grens, totals(66, 40), 6)).toBe(true);
    expect(isSessionComplete(grens, totals(71, 40), 6)).toBe(true);
  });

  it("kijkt bij een grens naar het HOOGSTE totaal, ook als de laagste score wint", () => {
    // Dit is de Take 5-casus en de subtielste regel van het hele ontwerp: het potje
    // stopt zodra iemand 66 haalt, en pas dáárna wint de laagste score. Draai je deze
    // vergelijking om, dan stopt Take 5 nooit.
    const grens = config({ format: "grens", target: 66 });
    expect(isSessionComplete(grens, totals(71, 12), 6)).toBe(true);
    expect(computeWinner(totals(71, 12), true)).toBe(LISANNE);
  });

  it("is bij een vrij aantal en bij de winnaar-vorm nooit vanzelf klaar", () => {
    expect(isSessionComplete(config({ format: "vrij" }), totals(99, 99), 20)).toBe(false);
    expect(isSessionComplete(config({ format: "winnaar" }), totals(9, 1), 10)).toBe(false);
  });

  it("is nooit klaar als de instelling ontbreekt", () => {
    expect(isSessionComplete(config({ format: "vast" }), totals(1, 1), 99)).toBe(false);
    expect(isSessionComplete(config({ format: "grens" }), totals(999, 1), 99)).toBe(false);
  });
});

describe("playersOverTarget", () => {
  it("noemt iedereen die over de grens is", () => {
    const grens = config({ format: "grens", target: 66 });
    const totals = [
      { player_id: EDWIN, score: 70 },
      { player_id: LISANNE, score: 30 },
    ];
    expect(playersOverTarget(grens, totals)).toEqual([EDWIN]);
  });

  it("geeft niets terug bij een andere vorm", () => {
    expect(playersOverTarget(config({ format: "vrij" }), [{ player_id: EDWIN, score: 999 }]))
      .toEqual([]);
  });
});

describe("sameParticipantScores", () => {
  const stand = [
    { player_id: EDWIN, score: 10 },
    { player_id: LISANNE, score: 5 },
  ];

  it("is volgorde-onafhankelijk", () => {
    expect(sameParticipantScores(stand, [...stand].reverse())).toBe(true);
  });

  it("ziet een gewijzigde score", () => {
    expect(
      sameParticipantScores(stand, [
        { player_id: EDWIN, score: 11 },
        { player_id: LISANNE, score: 5 },
      ])
    ).toBe(false);
  });

  it("ziet een verdwenen of nieuwe deelnemer", () => {
    expect(sameParticipantScores(stand, [{ player_id: EDWIN, score: 10 }])).toBe(false);
    expect(
      sameParticipantScores(stand, [...stand, { player_id: "minou", score: 3 }])
    ).toBe(false);
  });

  it("behandelt een ontbrekende score als null", () => {
    expect(
      sameParticipantScores([{ player_id: EDWIN, score: null }], [{ player_id: EDWIN, score: null }])
    ).toBe(true);
  });
});

describe("van invoer tot winnaar, per rondevorm", () => {
  it("vast aantal rondes: hoogste totaal wint", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "20", [LISANNE]: "30" },
      { [EDWIN]: "40", [LISANNE]: "-10" },
    ]);
    const totals = sumRounds(IEDEREEN, entries);
    expect(totals).toEqual([
      { player_id: EDWIN, score: 60 },
      { player_id: LISANNE, score: 20 },
    ]);
    expect(computeWinner(totals, false)).toBe(EDWIN);
  });

  it("tot een grens met laagste wint: Take 5", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "40", [LISANNE]: "12" },
      { [EDWIN]: "31", [LISANNE]: "9" },
    ]);
    const totals = sumRounds(IEDEREEN, entries);
    const grens = config({ format: "grens", target: 66 });
    expect(isSessionComplete(grens, totals, roundsPlayed(entries))).toBe(true);
    expect(playersOverTarget(grens, totals)).toEqual([EDWIN]);
    expect(computeWinner(totals, true)).toBe(LISANNE);
  });

  it("rondes met een winnaar: 3-2 voor wie de meeste rondes pakte", () => {
    // 1 voor de rondewinnaar, 0 voor de rest — het totaal ís dan het aantal rondes.
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "1", [LISANNE]: "0" },
      { [EDWIN]: "0", [LISANNE]: "1" },
      { [EDWIN]: "1", [LISANNE]: "0" },
      { [EDWIN]: "0", [LISANNE]: "1" },
      { [EDWIN]: "1", [LISANNE]: "0" },
    ]);
    const totals = sumRounds(IEDEREEN, entries);
    expect(totals).toEqual([
      { player_id: EDWIN, score: 3 },
      { player_id: LISANNE, score: 2 },
    ]);
    expect(computeWinner(totals, false)).toBe(EDWIN);
  });

  it("rondes met een winnaar: evenveel rondes is gelijkspel", () => {
    const entries = parseRoundEntries(IEDEREEN, [
      { [EDWIN]: "1", [LISANNE]: "0" },
      { [EDWIN]: "0", [LISANNE]: "1" },
    ]);
    expect(computeWinner(sumRounds(IEDEREEN, entries), false)).toBeNull();
  });
});
