import { describe, it, expect } from "vitest";
import {
  championOf,
  compareSeasonsDesc,
  computeStandings,
  isSameSeason,
  POINTS_DRAW,
  POINTS_WIN,
  seasonLabel,
  seasonOf,
  seasonRange,
  seasonsWithSessions,
  seasonShortLabel,
  type SeasonSession,
} from "@/lib/seasons";
import type { Player } from "@/lib/schemas";

function player(id: string): Player {
  return {
    id,
    name: id,
    emoji: "🎯",
    is_active: true,
    is_guest: false,
    include_by_default: true,
    created_at: "2025-01-01T00:00:00.000Z",
  };
}

const EDWIN = player("edwin");
const LISANNE = player("lisanne");
const MINOU = player("minou");

let seq = 0;
function seasonSession(
  over: Partial<SeasonSession> & { month?: number } = {}
): SeasonSession {
  seq++;
  const { month = 7, ...rest } = over;
  return {
    id: `s${seq}`,
    played_at: new Date(Date.UTC(2026, month - 1, 15, 19)).toISOString(),
    winner_id: "edwin",
    player_ids: ["edwin", "lisanne"],
    ...rest,
  };
}

describe("seasonOf", () => {
  it("mapt maanden op het juiste kwartaal", () => {
    expect(seasonOf(new Date(2026, 0, 15))).toEqual({ year: 2026, quarter: 1 });
    expect(seasonOf(new Date(2026, 2, 31))).toEqual({ year: 2026, quarter: 1 });
    expect(seasonOf(new Date(2026, 3, 1))).toEqual({ year: 2026, quarter: 2 });
    expect(seasonOf(new Date(2026, 6, 15))).toEqual({ year: 2026, quarter: 3 });
    expect(seasonOf(new Date(2026, 11, 31))).toEqual({ year: 2026, quarter: 4 });
  });

  it("werkt ook met een ISO-string", () => {
    expect(seasonOf("2025-05-10T12:00:00.000Z")).toEqual({
      year: 2025,
      quarter: 2,
    });
  });
});

describe("seasonRange", () => {
  it("dekt precies het kwartaal", () => {
    const range = seasonRange({ year: 2026, quarter: 3 });
    const from = new Date(range.from);
    const to = new Date(range.to);
    expect(from.getMonth()).toBe(6); // juli
    expect(from.getDate()).toBe(1);
    expect(to.getMonth()).toBe(8); // september
    expect(to.getDate()).toBe(30);
  });

  it("laat opeenvolgende kwartalen aansluiten zonder gat", () => {
    const q1 = seasonRange({ year: 2026, quarter: 1 });
    const q2 = seasonRange({ year: 2026, quarter: 2 });
    expect(new Date(q1.to).getTime()).toBeLessThan(new Date(q2.from).getTime());
  });

  it("laat een potje in het kwartaal binnen zijn eigen range vallen", () => {
    const played = new Date(2026, 7, 20, 19); // 20 augustus = Q3
    const range = seasonRange(seasonOf(played));
    expect(played.getTime()).toBeGreaterThanOrEqual(new Date(range.from).getTime());
    expect(played.getTime()).toBeLessThanOrEqual(new Date(range.to).getTime());
  });
});

describe("labels", () => {
  it("bevat kwartaal, jaar en maanden", () => {
    const label = seasonLabel({ year: 2026, quarter: 3 });
    expect(label).toContain("Q3 2026");
    expect(label).toContain("jul");
    expect(label).toContain("sep");
  });

  it("heeft een korte variant", () => {
    expect(seasonShortLabel({ year: 2026, quarter: 1 })).toBe("Q1 2026");
  });
});

describe("seizoensvergelijking", () => {
  it("herkent hetzelfde seizoen", () => {
    expect(isSameSeason({ year: 2026, quarter: 2 }, { year: 2026, quarter: 2 })).toBe(true);
    expect(isSameSeason({ year: 2026, quarter: 2 }, { year: 2025, quarter: 2 })).toBe(false);
  });

  it("sorteert nieuwste eerst", () => {
    const refs = [
      { year: 2025, quarter: 4 },
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
    ];
    expect([...refs].sort(compareSeasonsDesc)).toEqual([
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
      { year: 2025, quarter: 4 },
    ]);
  });
});

describe("seasonsWithSessions", () => {
  it("geeft alleen seizoenen waarin gespeeld is, nieuwste eerst", () => {
    const sessions = [
      seasonSession({ month: 8 }), // Q3 2026
      seasonSession({ month: 2 }), // Q1 2026
      seasonSession({ month: 8 }), // Q3 2026 opnieuw
    ];
    expect(seasonsWithSessions(sessions)).toEqual([
      { year: 2026, quarter: 3 },
      { year: 2026, quarter: 1 },
    ]);
  });

  it("is leeg zonder potjes", () => {
    expect(seasonsWithSessions([])).toEqual([]);
  });
});

describe("computeStandings", () => {
  it("geeft 3 punten voor winst en 1 voor gelijkspel", () => {
    const sessions = [
      seasonSession(),
      seasonSession({ winner_id: null }),
      seasonSession({ winner_id: "lisanne" }),
    ];
    const standings = computeStandings(sessions, [EDWIN, LISANNE]);
    const edwin = standings.find((s) => s.player.id === "edwin");
    const lisanne = standings.find((s) => s.player.id === "lisanne");

    expect(edwin).toMatchObject({
      points: POINTS_WIN + POINTS_DRAW,
      wins: 1,
      draws: 1,
      losses: 1,
      played: 3,
    });
    expect(lisanne).toMatchObject({
      points: POINTS_WIN + POINTS_DRAW,
      wins: 1,
      draws: 1,
      losses: 1,
      played: 3,
    });
  });

  it("telt punten alleen voor wie meedeed", () => {
    const sessions = [
      seasonSession(),
      seasonSession({ winner_id: "minou", player_ids: ["lisanne", "minou"] }),
    ];
    const standings = computeStandings(sessions, [EDWIN, LISANNE, MINOU]);
    expect(standings.find((s) => s.player.id === "edwin")?.played).toBe(1);
    expect(standings.find((s) => s.player.id === "minou")).toMatchObject({
      played: 1,
      wins: 1,
      points: POINTS_WIN,
    });
  });

  it("laat de som van de punten kloppen met de potjes", () => {
    const sessions = [
      seasonSession(),
      seasonSession(),
      seasonSession({ winner_id: null }),
    ];
    const standings = computeStandings(sessions, [EDWIN, LISANNE]);
    const total = standings.reduce((sum, s) => sum + s.points, 0);
    // 2 potjes met winnaar = 2x3, 1 gelijkspel met 2 deelnemers = 2x1.
    expect(total).toBe(2 * POINTS_WIN + 2 * POINTS_DRAW);
  });

  it("sorteert op punten", () => {
    const sessions = [
      seasonSession({ winner_id: "lisanne" }),
      seasonSession({ winner_id: "lisanne" }),
      seasonSession({ winner_id: "edwin" }),
    ];
    const standings = computeStandings(sessions, [EDWIN, LISANNE]);
    expect(standings.map((s) => s.player.id)).toEqual(["lisanne", "edwin"]);
  });

  it("breekt gelijke punten op het aantal wins", () => {
    // Edwin: 1 win = 3 punten. Lisanne: 3 gelijkspellen = 3 punten.
    const sessions = [
      seasonSession({ player_ids: ["edwin", "minou"], winner_id: "edwin" }),
      seasonSession({ player_ids: ["lisanne", "minou"], winner_id: null }),
      seasonSession({ player_ids: ["lisanne", "minou"], winner_id: null }),
      seasonSession({ player_ids: ["lisanne", "minou"], winner_id: null }),
    ];
    const standings = computeStandings(sessions, [LISANNE, EDWIN]);
    expect(standings[0]?.points).toBe(standings[1]?.points);
    expect(standings[0]?.player.id).toBe("edwin");
  });

  it("breekt gelijke punten en wins op het aantal gespeelde potjes", () => {
    // Beide 1 win, maar Edwin speelde er meer.
    const sessions = [
      seasonSession({ player_ids: ["edwin", "minou"], winner_id: "edwin" }),
      seasonSession({ player_ids: ["edwin", "minou"], winner_id: "minou" }),
      seasonSession({ player_ids: ["lisanne", "minou"], winner_id: "lisanne" }),
    ];
    const standings = computeStandings(sessions, [LISANNE, EDWIN]);
    expect(standings[0]?.player.id).toBe("edwin");
    expect(standings[0]?.played).toBe(2);
  });

  it("geeft nul punten aan een speler zonder potjes", () => {
    const standings = computeStandings([], [EDWIN]);
    expect(standings[0]).toMatchObject({ points: 0, played: 0 });
  });
});

describe("championOf", () => {
  it("wijst de bovenste speler aan", () => {
    const sessions = [seasonSession(), seasonSession()];
    const standings = computeStandings(sessions, [EDWIN, LISANNE]);
    expect(championOf(standings)?.player.id).toBe("edwin");
  });

  it("geeft null bij een gedeelde eerste plek", () => {
    const sessions = [seasonSession(), seasonSession({ winner_id: "lisanne" })];
    const standings = computeStandings(sessions, [EDWIN, LISANNE]);
    expect(championOf(standings)).toBeNull();
  });

  it("geeft null zonder gespeelde potjes", () => {
    expect(championOf(computeStandings([], [EDWIN, LISANNE]))).toBeNull();
  });

  it("geeft null bij een lege stand", () => {
    expect(championOf([])).toBeNull();
  });
});
