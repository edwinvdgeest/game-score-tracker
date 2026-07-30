import { describe, it, expect } from "vitest";
import {
  buildDustCard,
  buildMemoryCards,
  buildRecentCard,
  buildRecordCard,
  buildRevancheCard,
  buildRhythmCard,
  buildSpotlightCards,
  buildStreakCard,
  buildWrappedTeaserCard,
  computeGameRecap,
  filterCardsForPlayerCount,
  pickSpotlightCards,
  MAX_SPOTLIGHT_CARDS,
  type SpotlightCard,
} from "@/lib/spotlight";
import {
  at,
  makeSessionFactory,
  EDWIN,
  GOLF,
  LISANNE,
  MINOU,
  RUMMIKUB,
} from "@/lib/spotlight.fixtures";

/** 30 juli 2026, de dag waarop de screenshots gemaakt zijn. */
const TODAY = new Date(2026, 6, 30, 12, 0, 0);

describe("buildMemoryCards", () => {
  it("maakt een kaart per jaar met treffers, niet alleen voor het eerste jaar", () => {
    const session = makeSessionFactory();
    const cards = buildMemoryCards(
      [
        session({ played_at: at(2025, 7, 31) }),
        session({ played_at: at(2024, 8, 2) }),
        session({ played_at: at(2023, 7, 29) }),
      ],
      TODAY
    );

    expect(cards.map((card) => card.id)).toEqual([
      "memory-1y",
      "memory-2y",
      "memory-3y",
    ]);
    expect(cards[0]?.title).toBe("Een jaar geleden speelden jullie…");
    expect(cards[1]?.title).toBe("2 jaar geleden speelden jullie…");
  });

  it("neemt potjes tot drie dagen van de kalenderdag mee en de vierde niet", () => {
    const session = makeSessionFactory();
    const binnen = buildMemoryCards([session({ played_at: at(2025, 8, 2) })], TODAY);
    const buiten = buildMemoryCards([session({ played_at: at(2025, 8, 3) })], TODAY);

    expect(binnen).toHaveLength(1);
    expect(buiten).toHaveLength(0);
  });

  it("laat de nieuwste drie potjes zien met scores en winnaar", () => {
    const session = makeSessionFactory();
    const cards = buildMemoryCards(
      [
        session({ played_at: at(2025, 7, 28) }),
        session({ played_at: at(2025, 7, 29) }),
        session({ played_at: at(2025, 7, 30) }),
        session({ played_at: at(2025, 7, 31) }),
      ],
      TODAY
    );

    const entries = cards[0]?.entries ?? [];
    expect(entries).toHaveLength(3);
    expect(entries[0]?.subtitle).toContain("🎯 Edwin won");
    expect(entries[0]?.scores).toEqual([
      { emoji: "🎯", score: 80, isWinner: true },
      { emoji: "🌟", score: 70, isWinner: false },
    ]);
    expect(entries[0]?.replayGame).toEqual({
      id: RUMMIKUB.id,
      name: RUMMIKUB.name,
      emoji: RUMMIKUB.emoji,
    });
  });

  it("noemt een potje van precies vandaag apart en markeert het", () => {
    const session = makeSessionFactory();
    const cards = buildMemoryCards([session({ played_at: at(2024, 7, 30) })], TODAY);

    expect(cards[0]?.title).toBe("Vandaag 2 jaar geleden speelden jullie…");
    expect(cards[0]?.exactDay).toBe(true);
  });

  it("markeert een potje van een paar dagen ernaast niet als vandaag", () => {
    const session = makeSessionFactory();
    const cards = buildMemoryCards([session({ played_at: at(2024, 7, 28) })], TODAY);

    expect(cards[0]?.title).toBe("2 jaar geleden speelden jullie…");
    expect(cards[0]?.exactDay).toBeUndefined();
  });

  it("geeft niets terug zonder potjes", () => {
    expect(buildMemoryCards([], TODAY)).toEqual([]);
  });
});

describe("buildRecentCard", () => {
  it("zet het nieuwste potje bovenaan", () => {
    const session = makeSessionFactory();
    const card = buildRecentCard([
      session({ played_at: at(2026, 7, 20) }),
      session({ played_at: at(2026, 7, 29) }),
      session({ played_at: at(2026, 7, 25) }),
    ]);

    expect(card?.entries).toHaveLength(3);
    expect(card?.entries[0]?.subtitle).toContain("29 juli 2026");
  });

  it("bestaat niet zonder potjes", () => {
    expect(buildRecentCard([])).toBeNull();
  });
});

describe("buildStreakCard", () => {
  it("heet 'warm' bij twee winsten op rij", () => {
    const session = makeSessionFactory();
    const card = buildStreakCard(
      [session({ played_at: at(2026, 7, 30) }), session({ played_at: at(2026, 7, 29) })],
      [EDWIN, LISANNE]
    );

    expect(card?.title).toBe("Wie is er warm?");
    expect(card?.entries[0]?.subtitle).toBe("🔥 2 keer op rij gewonnen");
  });

  it("valt terug op de stand als niemand een reeks heeft", () => {
    const session = makeSessionFactory();
    const card = buildStreakCard(
      [
        session({ played_at: at(2026, 7, 30) }),
        session({
          played_at: at(2026, 7, 29),
          winner_id: LISANNE.id,
          winner: LISANNE,
        }),
      ],
      [EDWIN, LISANNE]
    );

    expect(card?.title).toBe("De stand tot nu toe");
    expect(card?.entries[0]?.subtitle).toBe("1 van 2 potjes gewonnen (50%)");
  });

  it("laat spelers weg die nog niet meededen", () => {
    const session = makeSessionFactory();
    const card = buildStreakCard([session()], [EDWIN, LISANNE, MINOU]);
    expect(card?.entries).toHaveLength(2);
  });
});

describe("buildRecordCard", () => {
  it("verzamelt hoogste score, grootste verschil en langste potje", () => {
    const session = makeSessionFactory();
    const card = buildRecordCard([
      session({
        scores: [
          { player: EDWIN, score: 120 },
          { player: LISANNE, score: 40 },
        ],
        duration_minutes: 55,
      }),
      session({ duration_minutes: 20 }),
    ]);

    expect(card?.entries[0]?.title).toBe("Hoogste score ooit: 120");
    expect(card?.entries[1]?.title).toBe("Grootste verschil: 80 punten");
    expect(card?.entries[2]?.title).toBe("Langste potje: 55 min");
  });

  it("laat spellen waar de laagste score wint buiten de hoogste score", () => {
    const session = makeSessionFactory();
    const card = buildRecordCard([
      session({
        game: GOLF,
        scores: [
          { player: EDWIN, score: 300 },
          { player: LISANNE, score: 90 },
        ],
      }),
    ]);

    expect(card?.entries.some((entry) => entry.title.includes("Hoogste score"))).toBe(
      false
    );
    // Het verschil rekent bij golf van de laagste twee scores af.
    expect(card?.entries[0]?.title).toBe("Grootste verschil: 210 punten");
  });

  it("bestaat niet zonder scores en zonder duur", () => {
    const session = makeSessionFactory();
    const card = buildRecordCard([
      session({
        scores: [
          { player: EDWIN, score: null },
          { player: LISANNE, score: null },
        ],
      }),
    ]);
    expect(card).toBeNull();
  });
});

describe("buildDustCard", () => {
  it("zet nooit gespeelde spellen bovenaan en daarna het langst stilstaande", () => {
    const session = makeSessionFactory();
    const card = buildDustCard(
      [RUMMIKUB, GOLF],
      [session({ played_at: at(2026, 1, 5) })],
      TODAY
    );

    expect(card?.entries[0]?.title).toBe("Golf");
    expect(card?.entries[0]?.subtitle).toBe("Nog nooit gespeeld");
    expect(card?.entries[1]?.title).toBe("Rummikub");
    expect(card?.entries[1]?.subtitle).toContain("maanden geleden");
    expect(card?.entries[1]?.replayGame?.id).toBe(RUMMIKUB.id);
  });

  it("noemt spellen van vorige week niet", () => {
    const session = makeSessionFactory();
    const card = buildDustCard([RUMMIKUB], [session({ played_at: at(2026, 7, 25) })], TODAY);
    expect(card).toBeNull();
  });
});

describe("buildRhythmCard", () => {
  it("vertelt hoe lang het geleden is, hoeveel dagen op rij en hoeveel deze maand", () => {
    const session = makeSessionFactory();
    const card = buildRhythmCard(
      [
        session({ played_at: at(2026, 7, 30) }),
        session({ played_at: at(2026, 7, 29) }),
        session({ played_at: at(2026, 7, 28) }),
        session({ played_at: at(2026, 6, 10) }),
      ],
      TODAY
    );

    expect(card?.entries[0]?.title).toBe("Laatste potje: vandaag");
    expect(card?.entries[1]?.title).toBe("3 dagen op rij gespeeld");
    expect(card?.entries[2]?.title).toBe("3 potjes deze maand");
    expect(card?.entries[2]?.subtitle).toBe("Vorige maand waren het er 1");
    expect(card?.footnote).toContain("Favoriete speeldag");
  });

  it("noemt geen reeks meer als er al weken niet gespeeld is", () => {
    const session = makeSessionFactory();
    const card = buildRhythmCard(
      [session({ played_at: at(2026, 5, 2) }), session({ played_at: at(2026, 5, 1) })],
      TODAY
    );

    expect(card?.entries.some((entry) => entry.title.includes("op rij"))).toBe(false);
    expect(card?.entries[0]?.title).toBe("Laatste potje: 3 maanden geleden");
  });
});

describe("buildRevancheCard", () => {
  it("zoekt het spel waar de achterstaande speler het hardst verliest", () => {
    const session = makeSessionFactory();
    const golf = (day: number) =>
      session({
        played_at: at(2026, 7, day),
        game: GOLF,
        winner_id: LISANNE.id,
        winner: LISANNE,
        scores: [
          { player: EDWIN, score: 90 },
          { player: LISANNE, score: 60 },
        ],
      });

    const card = buildRevancheCard([golf(10), golf(11), golf(12)], [EDWIN, LISANNE]);

    expect(card?.entries[0]?.title).toBe("Golf");
    expect(card?.entries[0]?.subtitle).toBe("🎯 Edwin won hier 0 van de 3 potjes");
    expect(card?.entries[0]?.replayGame?.id).toBe(GOLF.id);
    expect(card?.footnote).toContain("🌟 Lisanne 3 – 0 🎯 Edwin");
  });

  it("bestaat niet bij te weinig onderlinge potjes", () => {
    const session = makeSessionFactory();
    const card = buildRevancheCard(
      [session({ winner_id: LISANNE.id, winner: LISANNE })],
      [EDWIN, LISANNE]
    );
    expect(card).toBeNull();
  });
});

describe("buildWrappedTeaserCard", () => {
  it("verschijnt in december met een link naar dat jaar", () => {
    const session = makeSessionFactory();
    const card = buildWrappedTeaserCard(
      [session({ played_at: at(2026, 12, 3) })],
      new Date(2026, 11, 20)
    );

    expect(card?.cta).toEqual({ href: "/wrapped/2026", label: "🎁 Bekijk 2026" });
    expect(card?.entries[0]?.title).toBe("1 potjes in 2026");
  });

  it("kijkt in januari naar het jaar dat net afliep", () => {
    const session = makeSessionFactory();
    const card = buildWrappedTeaserCard(
      [session({ played_at: at(2025, 12, 3) })],
      new Date(2026, 0, 5)
    );
    expect(card?.cta?.href).toBe("/wrapped/2025");
  });

  it("bestaat niet in juli", () => {
    const session = makeSessionFactory();
    expect(buildWrappedTeaserCard([session()], TODAY)).toBeNull();
  });
});

describe("buildSpotlightCards", () => {
  it("levert alleen kaarten waarvoor genoeg gegevens zijn", () => {
    const session = makeSessionFactory();
    const cards = buildSpotlightCards({
      sessions: [session({ played_at: at(2026, 7, 29) })],
      games: [RUMMIKUB],
      players: [EDWIN, LISANNE],
      today: TODAY,
    });

    // Geen terugblik (te weinig historie), geen revanche, geen dust, geen wrapped.
    expect(cards.map((card) => card.id)).toEqual([
      "recent",
      "streak",
      "records",
      "rhythm",
    ]);
  });

  it("is leeg zonder gegevens", () => {
    expect(
      buildSpotlightCards({ sessions: [], games: [], players: [], today: TODAY })
    ).toEqual([]);
  });
});

describe("pickSpotlightCards", () => {
  const card = (id: string, kind: SpotlightCard["kind"] = "recent"): SpotlightCard => ({
    id,
    kind,
    emoji: "🎲",
    title: id,
    tone: "mint",
    entries: [],
  });
  const pool = [
    card("memory-1y", "memory"),
    card("recent", "recent"),
    card("revanche", "revanche"),
    card("streak", "streak"),
    card("records", "records"),
    card("rhythm", "rhythm"),
    card("dust", "dust"),
    card("wrapped-2026", "wrapped"),
  ];

  it("laat een korte stapel ongemoeid", () => {
    const short = pool.slice(0, 3);
    expect(pickSpotlightCards(short, 5)).toEqual(short);
  });

  it("kiest er nooit meer dan het maximum", () => {
    expect(pickSpotlightCards(pool, 0)).toHaveLength(MAX_SPOTLIGHT_CARDS);
  });

  it("geeft per seed een andere mix, en dezelfde seed dezelfde mix", () => {
    const eerste = pickSpotlightCards(pool, 0).map((c) => c.id);
    const tweede = pickSpotlightCards(pool, 3).map((c) => c.id);

    expect(pickSpotlightCards(pool, 3).map((c) => c.id)).toEqual(tweede);
    expect(tweede).not.toEqual(eerste);
  });

  it("houdt de terugblik altijd in de selectie", () => {
    for (let seed = 0; seed < pool.length; seed++) {
      const ids = pickSpotlightCards(pool, seed).map((c) => c.id);
      expect(ids).toContain("memory-1y");
    }
  });
});

describe("pickSpotlightCards met weggetikte soorten", () => {
  const card = (id: string, kind: SpotlightCard["kind"]): SpotlightCard => ({
    id,
    kind,
    emoji: "🎲",
    title: id,
    tone: "mint",
    entries: [],
  });

  it("laat een weggetikte soort naar achteren zakken", () => {
    const cards = [
      card("memory-1y", "memory"),
      card("dust", "dust"),
      card("recent", "recent"),
    ];
    const ids = pickSpotlightCards(cards, 0, ["dust"]).map((c) => c.id);

    expect(ids).toEqual(["memory-1y", "recent", "dust"]);
  });

  it("houdt weggetikte soorten uit de selectie zodra er genoeg andere zijn", () => {
    const cards = [
      card("memory-1y", "memory"),
      card("recent", "recent"),
      card("revanche", "revanche"),
      card("streak", "streak"),
      card("records", "records"),
      card("rhythm", "rhythm"),
      card("dust", "dust"),
    ];
    const ids = pickSpotlightCards(cards, 3, ["dust"]).map((c) => c.id);

    expect(ids).toHaveLength(MAX_SPOTLIGHT_CARDS);
    expect(ids).not.toContain("dust");
  });

  it("geeft een weggetikte terugblik geen voorrang meer", () => {
    const cards = [
      card("memory-1y", "memory"),
      card("recent", "recent"),
      card("revanche", "revanche"),
      card("streak", "streak"),
      card("records", "records"),
      card("rhythm", "rhythm"),
      card("dust", "dust"),
    ];
    const ids = pickSpotlightCards(cards, 1, ["memory"]).map((c) => c.id);

    expect(ids).not.toContain("memory-1y");
  });

  it("toont een weggetikte soort liever dan een lege carrousel", () => {
    const cards = [card("dust", "dust")];
    expect(pickSpotlightCards(cards, 0, ["dust"]).map((c) => c.id)).toEqual(["dust"]);
  });
});

describe("filterCardsForPlayerCount", () => {
  const withRange = (min: number, max: number) => ({
    emoji: "🎲",
    title: `${min}-${max}`,
    subtitle: "",
    scores: [],
    note: null,
    replayGame: null,
    playerRange: { min, max },
  });

  const dust: SpotlightCard = {
    id: "dust",
    kind: "dust",
    emoji: "🧹",
    title: "Staat al even stil",
    tone: "mint",
    entries: [withRange(2, 4), withRange(3, 6)],
  };

  it("laat tips weg die niet bij de bezetting passen", () => {
    const [card] = filterCardsForPlayerCount([dust], 2);
    expect(card?.entries.map((entry) => entry.title)).toEqual(["2-4"]);
  });

  it("laat de kaart vallen als er niets overblijft", () => {
    expect(filterCardsForPlayerCount([dust], 8)).toEqual([]);
  });

  it("raakt regels zonder spelersgrenzen niet aan", () => {
    const recent = buildRecentCard([makeSessionFactory()()]);
    expect(recent).not.toBeNull();
    expect(filterCardsForPlayerCount([recent as SpotlightCard], 5)).toEqual([recent]);
  });

  it("filtert niet zonder bekende bezetting", () => {
    expect(filterCardsForPlayerCount([dust], 0)).toEqual([dust]);
  });
});

describe("computeGameRecap", () => {
  it("geeft stand, record, duur en de laatste vijf potjes", () => {
    const session = makeSessionFactory();
    const sessions = [1, 2, 3, 4, 5, 6].map((day) =>
      session({ played_at: at(2026, 7, day), duration_minutes: 30 })
    );

    const recap = computeGameRecap(sessions, RUMMIKUB, [EDWIN, LISANNE]);

    expect(recap.totalSessions).toBe(6);
    expect(recap.entries).toHaveLength(5);
    expect(recap.entries[0]?.subtitle).toContain("6 juli 2026");
    expect(recap.standings[0]).toEqual({
      player: EDWIN,
      wins: 6,
      played: 6,
      winPercentage: 100,
    });
    expect(recap.avgDurationMinutes).toBe(30);
    expect(recap.record).toMatchObject({ score: 80, player: EDWIN, lowestWins: false });
    expect(recap.lastPlayedAt).toBe(at(2026, 7, 6));
  });

  it("neemt de laagste score als record bij een spel waar laagste wint", () => {
    const session = makeSessionFactory();
    const recap = computeGameRecap(
      [
        session({
          game: GOLF,
          winner_id: LISANNE.id,
          winner: LISANNE,
          scores: [
            { player: EDWIN, score: 95 },
            { player: LISANNE, score: 61 },
          ],
        }),
      ],
      GOLF,
      [EDWIN, LISANNE]
    );

    expect(recap.record).toMatchObject({ score: 61, player: LISANNE, lowestWins: true });
  });

  it("kan om met een spel dat nog nooit gespeeld is", () => {
    const recap = computeGameRecap([], GOLF, [EDWIN, LISANNE]);
    expect(recap).toMatchObject({
      totalSessions: 0,
      lastPlayedAt: null,
      avgDurationMinutes: null,
      record: null,
      standings: [],
      entries: [],
    });
  });
});
