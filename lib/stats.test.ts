import { describe, it, expect } from "vitest";
import {
  computeLeaderboard,
  computePlayerStats,
  computeWinner,
  didPlay,
  parseScoreEntries,
  type StatSession,
} from "@/lib/stats";
import type { Player } from "@/lib/schemas";

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    emoji: "🎯",
    is_active: true,
    is_guest: false,
    include_by_default: true,
    created_at: "2025-01-01T00:00:00.000Z",
    ...over,
  };
}

const EDWIN = player("edwin");
const LISANNE = player("lisanne");
const MINOU = player("minou");
const GUEST = player("guest", { is_guest: true });

/** Sessions newest-first, which is what the stats functions expect. */
function sessions(
  specs: Array<{ winner: string | null; players: string[] }>
): StatSession[] {
  return specs.map((spec, i) => ({
    id: `s${i}`,
    // Descending so index 0 is the newest.
    played_at: new Date(Date.UTC(2025, 0, 100 - i)).toISOString(),
    winner_id: spec.winner,
    player_ids: spec.players,
  }));
}

describe("didPlay", () => {
  it("is true only for participants", () => {
    const [s] = sessions([{ winner: "edwin", players: ["edwin", "lisanne"] }]);
    expect(s).toBeDefined();
    if (!s) return;
    expect(didPlay(s, "edwin")).toBe(true);
    expect(didPlay(s, "minou")).toBe(false);
  });
});

describe("computePlayerStats", () => {
  it("telt alles mee als beide spelers elk potje spelen", () => {
    const all = sessions([
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "lisanne", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
    ]);
    const edwin = computePlayerStats(all, EDWIN);
    expect(edwin.total_games).toBe(4);
    expect(edwin.wins).toBe(3);
    expect(edwin.win_percentage).toBe(75);
  });

  it("rekent een derde speler alleen zijn eigen potjes aan — de oude bug", () => {
    // Minou deed 1 van de 10 potjes mee en won dat potje.
    const all = sessions([
      { winner: "minou", players: ["edwin", "lisanne", "minou"] },
      ...Array.from({ length: 9 }, () => ({
        winner: "edwin",
        players: ["edwin", "lisanne"],
      })),
    ]);

    const minou = computePlayerStats(all, MINOU);
    expect(minou.total_games).toBe(1);
    expect(minou.wins).toBe(1);
    expect(minou.win_percentage).toBe(100);

    // Voorheen was total_games voor iedereen 10 en kwam Minou op 10% uit.
    const edwin = computePlayerStats(all, EDWIN);
    expect(edwin.total_games).toBe(10);
    expect(edwin.wins).toBe(9);
    expect(edwin.win_percentage).toBe(90);
  });

  it("laat een gastpotje de cijfers van een niet-deelnemer ongemoeid", () => {
    const withoutGuest = sessions([
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
    ]);
    const withGuest = sessions([
      { winner: "guest", players: ["lisanne", "guest"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
    ]);

    expect(computePlayerStats(withGuest, EDWIN)).toMatchObject(
      computePlayerStats(withoutGuest, EDWIN)
    );
  });

  it("telt een gelijkspel als gespeeld potje maar niet als winst", () => {
    const all = sessions([
      { winner: null, players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
    ]);
    const edwin = computePlayerStats(all, EDWIN);
    expect(edwin.total_games).toBe(2);
    expect(edwin.wins).toBe(1);
    expect(edwin.win_percentage).toBe(50);

    // Daardoor tellen de percentages van beide spelers op tot minder dan 100.
    const lisanne = computePlayerStats(all, LISANNE);
    expect(edwin.win_percentage + lisanne.win_percentage).toBeLessThan(100);
  });

  it("geeft 0% en geen NaN voor een speler zonder potjes", () => {
    const stats = computePlayerStats([], EDWIN);
    expect(stats.total_games).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.win_percentage).toBe(0);
  });

  it("laat een potje dat de speler niet meedeed de reeks niet breken", () => {
    const all = sessions([
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "minou", players: ["lisanne", "minou"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
    ]);
    expect(computePlayerStats(all, EDWIN).current_streak).toBe(2);
  });

  it("berekent de langste reeks over alleen de eigen potjes", () => {
    const all = sessions([
      { winner: "lisanne", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "lisanne", players: ["edwin", "lisanne"] },
    ]);
    const edwin = computePlayerStats(all, EDWIN);
    expect(edwin.current_streak).toBe(0);
    expect(edwin.longest_streak).toBe(3);
  });
});

describe("computeLeaderboard", () => {
  it("sorteert op wins, niet op percentage", () => {
    const all = sessions([
      // De gast speelde 1 potje en won het: 100%, maar hoort niet bovenaan.
      { winner: "guest", players: ["edwin", "guest"] },
      ...Array.from({ length: 5 }, () => ({
        winner: "edwin",
        players: ["edwin", "lisanne"],
      })),
    ]);
    const board = computeLeaderboard(all, [GUEST, LISANNE, EDWIN]);
    expect(board.map((r) => r.player.id)).toEqual(["edwin", "guest", "lisanne"]);
  });

  it("breekt gelijke wins op percentage en dan op aantal potjes", () => {
    const all = sessions([
      { winner: "edwin", players: ["edwin", "lisanne"] },
      { winner: "lisanne", players: ["lisanne", "minou"] },
      { winner: "minou", players: ["lisanne", "minou"] },
      { winner: "minou", players: ["lisanne", "minou"] },
    ]);
    const board = computeLeaderboard(all, [EDWIN, LISANNE, MINOU]);
    // Minou 2 wins, dan Edwin (1 win / 1 potje = 100%) voor Lisanne (1 van 4 = 25%).
    expect(board.map((r) => r.player.id)).toEqual(["minou", "edwin", "lisanne"]);
  });
});

describe("computeWinner", () => {
  it("kiest de hoogste score", () => {
    expect(
      computeWinner([
        { player_id: "a", score: 10 },
        { player_id: "b", score: 12 },
      ])
    ).toBe("b");
  });

  it("kiest de laagste score als lowestWins", () => {
    expect(
      computeWinner(
        [
          { player_id: "a", score: 10 },
          { player_id: "b", score: 12 },
        ],
        true
      )
    ).toBe("a");
  });

  it("geeft null bij een gelijke topscore", () => {
    expect(
      computeWinner([
        { player_id: "a", score: 12 },
        { player_id: "b", score: 12 },
      ])
    ).toBeNull();
  });

  it("geeft null als er geen enkele score is", () => {
    expect(
      computeWinner([
        { player_id: "a", score: null },
        { player_id: "b", score: null },
      ])
    ).toBeNull();
    expect(computeWinner([])).toBeNull();
  });

  it("negeert lege scores en kiest uit de rest", () => {
    expect(
      computeWinner([
        { player_id: "a", score: null },
        { player_id: "b", score: 3 },
      ])
    ).toBe("b");
  });

  it("werkt met negatieve scores bij lowestWins", () => {
    expect(
      computeWinner(
        [
          { player_id: "a", score: -5 },
          { player_id: "b", score: 0 },
        ],
        true
      )
    ).toBe("a");
  });
});

describe("parseScoreEntries", () => {
  it("maakt lege en onleesbare velden null", () => {
    expect(
      parseScoreEntries(["a", "b", "c"], { a: "12", b: "  ", c: "abc" })
    ).toEqual([
      { player_id: "a", score: 12 },
      { player_id: "b", score: null },
      { player_id: "c", score: null },
    ]);
  });

  it("behandelt een ontbrekend veld als leeg", () => {
    expect(parseScoreEntries(["a"], {})).toEqual([
      { player_id: "a", score: null },
    ]);
  });

  it("leest negatieve scores", () => {
    expect(parseScoreEntries(["a"], { a: "-3" })).toEqual([
      { player_id: "a", score: -3 },
    ]);
  });
});
