import { describe, it, expect } from "vitest";
import {
  computeHeadToHead,
  decidePair,
  pairKey,
  type DuelSession,
} from "@/lib/duel";

const A = "edwin";
const B = "lisanne";
const C = "minou";

let seq = 0;
function duelSession(over: Partial<DuelSession> = {}): DuelSession {
  seq++;
  return {
    id: `s${seq}`,
    // Aflopend, zodat het eerste element het nieuwste potje is.
    played_at: new Date(Date.UTC(2026, 0, 1000 - seq)).toISOString(),
    game: { id: "g1", name: "Wingspan", emoji: "🦅", lowest_score_wins: false },
    winner_id: A,
    scores: [
      { player_id: A, score: 80 },
      { player_id: B, score: 70 },
    ],
    ...over,
  };
}

describe("pairKey", () => {
  it("is onafhankelijk van de volgorde", () => {
    expect(pairKey(A, B)).toBe(pairKey(B, A));
  });
});

describe("decidePair", () => {
  it("vergelijkt de scores", () => {
    expect(decidePair(duelSession(), A, B)).toBe("a");
  });

  it("keert om bij lowest_score_wins", () => {
    const session = duelSession({
      game: { id: "g2", name: "Golf", emoji: "⛳", lowest_score_wins: true },
    });
    expect(decidePair(session, A, B)).toBe("b");
  });

  it("geeft remise bij gelijke scores", () => {
    const session = duelSession({
      winner_id: null,
      scores: [
        { player_id: A, score: 70 },
        { player_id: B, score: 70 },
      ],
    });
    expect(decidePair(session, A, B)).toBe("draw");
  });

  it("laat A van B winnen ook als een derde de sessie won", () => {
    // Dit is de kern van de paarsgewijze regel: Minou wint het potje, maar tussen
    // Edwin en Lisanne staat Edwin hoger.
    const session = duelSession({
      winner_id: C,
      scores: [
        { player_id: A, score: 80 },
        { player_id: B, score: 70 },
        { player_id: C, score: 95 },
      ],
    });
    expect(decidePair(session, A, B)).toBe("a");
  });

  it("valt zonder scores terug op de sessiewinnaar", () => {
    const session = duelSession({
      winner_id: B,
      scores: [
        { player_id: A, score: null },
        { player_id: B, score: null },
      ],
    });
    expect(decidePair(session, A, B)).toBe("b");
  });

  it("is remise als een derde won en er geen scores zijn", () => {
    const session = duelSession({
      winner_id: C,
      scores: [
        { player_id: A, score: null },
        { player_id: B, score: null },
        { player_id: C, score: null },
      ],
    });
    expect(decidePair(session, A, B)).toBe("draw");
  });

  it("valt terug op de winnaar als maar een van de twee een score heeft", () => {
    const session = duelSession({
      winner_id: A,
      scores: [
        { player_id: A, score: 50 },
        { player_id: B, score: null },
      ],
    });
    expect(decidePair(session, A, B)).toBe("a");
  });
});

describe("computeHeadToHead", () => {
  it("negeert potjes waar niet beide spelers meededen", () => {
    const sessions = [
      duelSession(),
      duelSession({
        winner_id: C,
        scores: [
          { player_id: B, score: 40 },
          { player_id: C, score: 60 },
        ],
      }),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.total).toBe(1);
    expect(h2h.aWins).toBe(1);
  });

  it("telt wins, verliezen en remises op tot het totaal", () => {
    const sessions = [
      duelSession(),
      duelSession({
        scores: [
          { player_id: A, score: 10 },
          { player_id: B, score: 20 },
        ],
        winner_id: B,
      }),
      duelSession({
        winner_id: null,
        scores: [
          { player_id: A, score: 30 },
          { player_id: B, score: 30 },
        ],
      }),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.aWins + h2h.bWins + h2h.draws).toBe(h2h.total);
    expect(h2h).toMatchObject({ aWins: 1, bWins: 1, draws: 1, total: 3 });
  });

  it("splitst de stand per spel", () => {
    const sessions = [
      duelSession(),
      duelSession(),
      duelSession({
        game: { id: "g2", name: "Azul", emoji: "🔷", lowest_score_wins: false },
        winner_id: B,
        scores: [
          { player_id: A, score: 20 },
          { player_id: B, score: 40 },
        ],
      }),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.perGame).toHaveLength(2);
    const wingspan = h2h.perGame.find((r) => r.game.id === "g1");
    const azul = h2h.perGame.find((r) => r.game.id === "g2");
    expect(wingspan).toMatchObject({ aWins: 2, bWins: 0, total: 2 });
    expect(azul).toMatchObject({ aWins: 0, bWins: 1, total: 1 });
  });

  it("wijst het nemesis-spel alleen aan met genoeg potjes", () => {
    // Azul: A verliest 3 van 3. Wingspan: A wint 2 van 2. Met een drempel van 3
    // potjes is Azul de nemesis en valt Wingspan buiten de kandidaten.
    const sessions = [
      duelSession(),
      duelSession(),
      ...Array.from({ length: 3 }, () =>
        duelSession({
          game: { id: "g2", name: "Azul", emoji: "🔷", lowest_score_wins: false },
          winner_id: B,
          scores: [
            { player_id: A, score: 20 },
            { player_id: B, score: 40 },
          ],
        })
      ),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.nemesisForA?.game.id).toBe("g2");
  });

  it("geeft geen nemesis als geen spel de drempel haalt", () => {
    const h2h = computeHeadToHead([duelSession()], A, B);
    expect(h2h.nemesisForA).toBeNull();
  });

  it("vindt de grootste marge met spel en datum", () => {
    const sessions = [
      duelSession(),
      duelSession({
        game: { id: "g2", name: "Azul", emoji: "🔷", lowest_score_wins: false },
        winner_id: B,
        scores: [
          { player_id: A, score: 5 },
          { player_id: B, score: 90 },
        ],
      }),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.biggestMargin).toMatchObject({
      margin: 85,
      winner: "b",
    });
    expect(h2h.biggestMargin?.game.id).toBe("g2");
  });

  it("negeert potjes zonder scores voor de grootste marge", () => {
    const sessions = [
      duelSession({
        winner_id: A,
        scores: [
          { player_id: A, score: null },
          { player_id: B, score: null },
        ],
      }),
    ];
    expect(computeHeadToHead(sessions, A, B).biggestMargin).toBeNull();
  });

  it("geeft de huidige reeks positief voor A en negatief voor B", () => {
    const aLeads = [duelSession(), duelSession(), duelSession()];
    expect(computeHeadToHead(aLeads, A, B).currentStreakA).toBe(3);

    const bLeads = Array.from({ length: 2 }, () =>
      duelSession({
        winner_id: B,
        scores: [
          { player_id: A, score: 10 },
          { player_id: B, score: 20 },
        ],
      })
    );
    expect(computeHeadToHead(bLeads, A, B).currentStreakA).toBe(-2);
  });

  it("breekt de huidige reeks op een remise", () => {
    const sessions = [
      duelSession({
        winner_id: null,
        scores: [
          { player_id: A, score: 30 },
          { player_id: B, score: 30 },
        ],
      }),
      duelSession(),
    ];
    expect(computeHeadToHead(sessions, A, B).currentStreakA).toBe(0);
  });

  it("berekent de langste reeks voor beide spelers", () => {
    const bWin = () =>
      duelSession({
        winner_id: B,
        scores: [
          { player_id: A, score: 10 },
          { player_id: B, score: 20 },
        ],
      });
    const sessions = [
      duelSession(),
      bWin(),
      bWin(),
      bWin(),
      duelSession(),
      duelSession(),
    ];
    const h2h = computeHeadToHead(sessions, A, B);
    expect(h2h.longestStreakB).toBe(3);
    expect(h2h.longestStreakA).toBe(2);
  });

  it("geeft een leeg resultaat zonder gedeelde potjes", () => {
    const h2h = computeHeadToHead([], A, B);
    expect(h2h).toMatchObject({
      aWins: 0,
      bWins: 0,
      draws: 0,
      total: 0,
      currentStreakA: 0,
    });
    expect(h2h.perGame).toEqual([]);
  });
});
