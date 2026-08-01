import { describe, it, expect } from "vitest";
import type { Game } from "@/lib/schemas";
import { stepsFor, nextStep, prevStep, stepAfterGame } from "./wizard-steps";

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "g1",
    name: "Rummikub",
    emoji: "🔢",
    category: "bordspel",
    min_players: 2,
    max_players: 4,
    created_at: "2026-01-01T00:00:00.000Z",
    lowest_score_wins: false,
    ...overrides,
  } as unknown as Game;
}

describe("stepsFor", () => {
  it("geeft de volledige lijst zolang er geen spel gekozen is", () => {
    expect(stepsFor(null)).toEqual(["game", "starter", "scores"]);
  });

  it("houdt de beginner-stap bij een gewoon spel", () => {
    expect(stepsFor(makeGame({ starter_matters: true }))).toEqual([
      "game",
      "starter",
      "scores",
    ]);
  });

  it("laat de beginner-stap weg als het niet uitmaakt wie begint", () => {
    expect(stepsFor(makeGame({ starter_matters: false }))).toEqual(["game", "scores"]);
  });

  it("valt terug op de beginner-stap voor een spel van vóór de migratie", () => {
    // starter_matters ontbreekt volledig — het oude gedrag is dan het juiste.
    expect(stepsFor(makeGame())).toEqual(["game", "starter", "scores"]);
  });

  it("geeft het rondescherm bij een rondespel", () => {
    expect(stepsFor(makeGame({ round_format: "vast", round_count: 10 }))).toEqual([
      "game",
      "starter",
      "rounds",
    ]);
  });

  it("valt terug op één totaal als de rondes voor dit potje overgeslagen zijn", () => {
    // Rondes zijn nooit verplicht: soms wordt de score anders bijgehouden. Dat geldt
    // per potje — de spelinstelling blijft staan.
    const game = makeGame({ round_format: "grens", round_target: 66 });
    expect(stepsFor(game, { skipRounds: true })).toEqual(["game", "starter", "scores"]);
    expect(stepsFor(game)).toEqual(["game", "starter", "rounds"]);
  });

  it("combineert overgeslagen rondes met een spel zonder beginner-stap", () => {
    // Take 5: geen beginner én rondes overgeslagen — dan blijven er twee stappen over.
    const game = makeGame({
      starter_matters: false,
      round_format: "grens",
      round_target: 66,
    });
    expect(stepsFor(game, { skipRounds: true })).toEqual(["game", "scores"]);
  });
});

describe("nextStep / prevStep", () => {
  const drie = stepsFor(makeGame({ starter_matters: true }));
  const twee = stepsFor(makeGame({ starter_matters: false }));

  it("loopt vooruit door de stappen", () => {
    expect(nextStep(drie, "game")).toBe("starter");
    expect(nextStep(drie, "starter")).toBe("scores");
  });

  it("slaat de beginner-stap over als die er niet is", () => {
    expect(nextStep(twee, "game")).toBe("scores");
  });

  it("geeft null aan de randen", () => {
    expect(nextStep(drie, "scores")).toBeNull();
    expect(prevStep(drie, "game")).toBeNull();
  });

  it("loopt terug door de stappen", () => {
    expect(prevStep(drie, "scores")).toBe("starter");
    expect(prevStep(twee, "scores")).toBe("game");
  });

  it("geeft null voor een stap die niet in de lijst zit", () => {
    // "starter" bestaat niet bij een beginner-loos spel: terugswipen mag daar niet
    // alsnog op die stap uitkomen.
    expect(nextStep(twee, "starter")).toBeNull();
    expect(prevStep(twee, "starter")).toBeNull();
  });
});

describe("stepAfterGame", () => {
  it("landt op de beginner-stap bij een gewoon spel", () => {
    expect(stepAfterGame(makeGame({ starter_matters: true }))).toBe("starter");
  });

  it("landt meteen op de scores als de beginner niet uitmaakt", () => {
    expect(stepAfterGame(makeGame({ starter_matters: false }))).toBe("scores");
  });

  it("landt op het rondescherm bij een rondespel zonder beginner-stap", () => {
    expect(
      stepAfterGame(makeGame({ starter_matters: false, round_format: "vrij" }))
    ).toBe("rounds");
  });
});
