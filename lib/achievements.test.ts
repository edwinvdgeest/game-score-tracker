import { describe, it, expect } from "vitest";
import { TOTAL_ACHIEVEMENTS } from "@/lib/achievements";
import { E, L, earned, makeSessionFactory } from "@/lib/achievements.fixtures";

describe("achievements", () => {
  it("defines badges", () => {
    expect(TOTAL_ACHIEVEMENTS).toBeGreaterThan(0);
  });

  describe("wins en reeksen", () => {
    const session = makeSessionFactory();
    const sessions = Array.from({ length: 12 }, () => session());
    const ids = earned(sessions, E);

    it("geeft eerste_winst na 1 win", () => {
      expect(ids).toContain("eerste_winst");
    });

    it("geeft tien_wins na 12 wins", () => {
      expect(ids).toContain("tien_wins");
    });

    it("geeft kwart_eeuw nog niet", () => {
      expect(ids).not.toContain("kwart_eeuw");
    });

    it("geeft legende bij 10 op rij", () => {
      expect(ids).toContain("legende");
    });

    it("geeft huisbaas bij 5x hetzelfde spel op rij", () => {
      expect(ids).toContain("huisbaas");
    });

    it("geeft stamgast nog niet", () => {
      expect(ids).not.toContain("stamgast");
    });

    it("geeft de verliezer geen wins-badge", () => {
      expect(earned(sessions, L)).not.toContain("eerste_winst");
    });
  });

  it("breekt een reeks-badge niet op een potje dat de speler niet meedeed", () => {
    const session = makeSessionFactory();
    // Precies drie wins van Edwin, met halverwege een potje tussen Lisanne en Minou waar
    // Edwin niet aan meedeed. Zonder deelnamefilter zou die reeks in 2 + 1 breken en
    // "op_dreef" (3 op rij) niet behaald worden.
    const sessions = [
      session(),
      session(),
      session({ winner_id: "minou", players: [L, "minou"] }),
      session(),
    ];
    expect(earned(sessions, E)).toContain("op_dreef");
  });

  it("geeft comeback_kid na 3x verlies", () => {
    const session = makeSessionFactory();
    const sessions = [
      session({ winner_id: L }),
      session({ winner_id: L }),
      session({ winner_id: L }),
      session({ winner_id: E }),
    ];
    expect(earned(sessions, E)).toContain("comeback_kid");
  });

  describe("categorieen en moeilijkheid", () => {
    it("geeft alleskunner bij 4 categorieen", () => {
      const session = makeSessionFactory();
      const cats = ["bordspel", "kaartspel", "dobbelspel", "woordspel"];
      const sessions = cats.map((c, i) =>
        session({ game_id: `g${i}`, game_category: c })
      );
      expect(earned(sessions, E)).toContain("alleskunner");
    });

    it("geeft denksporter bij 10 zware wins", () => {
      const session = makeSessionFactory();
      const cats = ["bordspel", "kaartspel", "dobbelspel", "woordspel"];
      const sessions = cats.map((c, i) =>
        session({ game_id: `g${i}`, game_category: c })
      );
      const hard = Array.from({ length: 10 }, (_, i) =>
        session({ game_id: `h${i}`, game_difficulty: 5 })
      );
      expect(earned(sessions.concat(hard), E)).toContain("denksporter");
    });
  });

  describe("laagste score wint", () => {
    const session = makeSessionFactory();
    const sessions = [
      session({ lowest_score_wins: true, scores: { [E]: 3, [L]: 20 } }),
    ];
    const ids = earned(sessions, E);

    it("geeft omdenker", () => {
      expect(ids).toContain("omdenker");
    });

    it("geeft geen dominant — de scores zijn omgekeerd bedoeld", () => {
      expect(ids).not.toContain("dominant");
    });
  });

  describe("tijd en datum", () => {
    const session = makeSessionFactory();
    const sessions = [
      session({ played_at: "2025-07-01T21:30:00.000Z" }), // 23:30 NL
      session({ played_at: "2025-07-02T06:00:00.000Z" }), // 08:00 NL
      session({ played_at: "2025-12-25T18:00:00.000Z" }),
      session({ played_at: "2025-12-31T20:00:00.000Z" }),
    ];
    const ids = earned(sessions, E);

    it("geeft nachtbraker bij 23:30 NL", () => {
      expect(ids).toContain("nachtbraker");
    });

    it("geeft vroege_vogel bij 08:00 NL", () => {
      expect(ids).toContain("vroege_vogel");
    });

    it("geeft kerstkampioen op 25 december", () => {
      expect(ids).toContain("kerstkampioen");
    });

    it("geeft oud_en_nieuw op 31 december", () => {
      expect(ids).toContain("oud_en_nieuw");
    });
  });

  describe("vier weken op rij", () => {
    it("geeft trouwe_speler bij 4 aaneengesloten weken", () => {
      const session = makeSessionFactory();
      const weeks = [0, 1, 2, 3].map((w) =>
        session({ played_at: new Date(Date.UTC(2025, 2, 3 + w * 7, 19)).toISOString() })
      );
      expect(earned(weeks, E)).toContain("trouwe_speler");
    });

    it("geeft trouwe_speler niet met een gat in de reeks", () => {
      const session = makeSessionFactory();
      const gap = [0, 1, 3, 4].map((w) =>
        session({ played_at: new Date(Date.UTC(2025, 2, 3 + w * 7, 19)).toISOString() })
      );
      expect(earned(gap, E)).not.toContain("trouwe_speler");
    });
  });

  describe("marathon", () => {
    const session = makeSessionFactory();
    const day = "2025-05-10";
    const marathon = Array.from({ length: 5 }, (_, i) =>
      session({
        played_at: `${day}T${String(12 + i).padStart(2, "0")}:00:00.000Z`,
        marathon_id: "m1",
        duration_minutes: 45,
        winner_id: i < 3 ? E : L,
      })
    );
    const ids = earned(marathon, E);

    it("geeft marathonspeler bij 5 potjes op een dag", () => {
      expect(ids).toContain("marathonspeler");
    });

    it("geeft ijzeren_man nog niet", () => {
      expect(ids).not.toContain("ijzeren_man");
    });

    it("geeft marathonwinnaar met 3 van 5 wins", () => {
      expect(ids).toContain("marathonwinnaar");
    });

    it("geeft uithoudingsvermogen bij 225 minuten", () => {
      expect(ids).toContain("uithoudingsvermogen");
    });

    it("geeft marathonwinnaar niet aan de verliezer", () => {
      expect(earned(marathon, L)).not.toContain("marathonwinnaar");
    });
  });

  describe("speciale scores", () => {
    it("geeft nipte_winst en dominant, maar recordbreker nog niet", () => {
      const session = makeSessionFactory();
      const sessions = [
        session({ scores: { [E]: 21, [L]: 20 } }),
        session({ scores: { [E]: 60, [L]: 25 } }),
      ];
      const ids = earned(sessions, E);
      expect(ids).toContain("nipte_winst");
      expect(ids).toContain("dominant");
      expect(ids).not.toContain("recordbreker");
    });

    it("geeft recordbreker bij de hoogste score ooit, en niet aan de ander", () => {
      const session = makeSessionFactory();
      const many = [
        session({ scores: { [E]: 100, [L]: 20 } }),
        session({ scores: { [E]: 30, [L]: 20 } }),
        session({ scores: { [E]: 30, [L]: 20 } }),
        session({ scores: { [E]: 30, [L]: 20 } }),
      ];
      expect(earned(many, E)).toContain("recordbreker");
      expect(earned(many, L)).not.toContain("recordbreker");
    });
  });

  describe("sociaal", () => {
    it("geeft gastheer bij 5 gasten, maar alleen met een gastenlijst", () => {
      const session = makeSessionFactory();
      const guests = ["gu1", "gu2", "gu3", "gu4", "gu5"];
      const sessions = guests.map((g) => session({ players: [E, L, g] }));
      expect(earned(sessions, E, guests)).toContain("gastheer");
      expect(earned(sessions, E)).not.toContain("gastheer");
    });

    it("geeft diplomaat bij 5 gelijkspellen", () => {
      const session = makeSessionFactory();
      const ties = Array.from({ length: 5 }, () => session({ winner_id: null }));
      expect(earned(ties, E)).toContain("diplomaat");
    });

    it("geeft openingszet bij 10 wins als starter", () => {
      const session = makeSessionFactory();
      const starterWins = Array.from({ length: 10 }, () => session({ starter_id: E }));
      expect(earned(starterWins, E)).toContain("openingszet");
    });

    it("geeft underdog bij 25 wins als niet-starter, rivaal nog niet", () => {
      const session = makeSessionFactory();
      const underdog = Array.from({ length: 25 }, () => session({ starter_id: L }));
      const ids = earned(underdog, E);
      expect(ids).toContain("underdog");
      expect(ids).not.toContain("rivaal");
    });
  });

  describe("week- en maandkampioen", () => {
    const session = makeSessionFactory();
    const monthWins = Array.from({ length: 6 }, (_, i) =>
      session({ played_at: new Date(Date.UTC(2025, 3, 2 + i, 19)).toISOString() })
    );
    const withLoss = monthWins.concat([
      session({
        played_at: new Date(Date.UTC(2025, 3, 20, 19)).toISOString(),
        winner_id: L,
      }),
    ]);

    it("geeft maandkampioen bij 6 wins in een maand", () => {
      expect(earned(withLoss, E)).toContain("maandkampioen");
    });

    it("geeft maandkampioen niet aan de speler met 1 win", () => {
      expect(earned(withLoss, L)).not.toContain("maandkampioen");
    });

    it("geeft weekkampioen", () => {
      expect(earned(withLoss, E)).toContain("weekkampioen");
    });
  });
});
