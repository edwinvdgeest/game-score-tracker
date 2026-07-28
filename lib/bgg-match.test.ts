import { describe, it, expect } from "vitest";
import {
  normalizeGameName,
  scoreBggCandidate,
  pickBestBggMatch,
  rankBggCandidates,
  bggSearchTermFor,
} from "@/lib/bgg-match";
import { parseBggSearchXml } from "@/lib/bgg";
import { SEARCH_XML_QWIXX, SEARCH_XML_UNO } from "@/lib/bgg.fixtures";

const qwixxHits = parseBggSearchXml(SEARCH_XML_QWIXX);
const unoHits = parseBggSearchXml(SEARCH_XML_UNO);

describe("normalizeGameName", () => {
  it("haalt het Engelse lidwoord 'The' weg", () => {
    expect(normalizeGameName("The Quacks of Quedlinburg")).toBe("quacks of quedlinburg");
  });

  it("haalt het Nederlandse lidwoord 'De' weg", () => {
    expect(normalizeGameName("De Kolonisten van Catan")).toBe("kolonisten van catan");
  });

  it("verwijdert diakritische tekens", () => {
    expect(normalizeGameName("Glück & Glas")).toBe("gluck and glas");
  });

  it("negeert leestekens en hoofdletters", () => {
    expect(normalizeGameName("Sushi Go!")).toBe("sushi go");
  });

  it("klapt dubbele spaties in, zoals in de spellijst voorkomen", () => {
    expect(normalizeGameName("Keer op keer nog een keer  - lvl 3")).toBe(
      "keer op keer nog een keer lvl 3"
    );
  });

  it("maakt varianten met en zonder dubbele spatie identiek", () => {
    expect(normalizeGameName("Keer op keer nog een keer  - lvl 3")).toBe(
      normalizeGameName("Keer op keer nog een keer - lvl 3")
    );
  });
});

describe("bggSearchTermFor", () => {
  it("vertaalt een Nederlandse titel naar de BGG-naam", () => {
    expect(bggSearchTermFor("Regenwormen")).toBe("Heckmeck am Bratwurmeck");
  });

  it("vertaalt ongeacht hoofdletters", () => {
    expect(bggSearchTermFor("vlotte geesten")).toBe("Geistesblitz");
  });

  it("laat een naam zonder alias ongemoeid", () => {
    expect(bggSearchTermFor("Ticket to Ride")).toBe("Ticket to Ride");
  });
});

describe("pickBestBggMatch", () => {
  it("matcht 'Quacks of Quedlinburg' op 'The Quacks of Quedlinburg'", () => {
    const hits = [
      { id: 244521, name: "The Quacks of Quedlinburg", yearPublished: 2018, isPrimary: true },
    ];
    const match = pickBestBggMatch("Quacks of Quedlinburg", hits);
    expect(match?.hit.id).toBe(244521);
    expect(match?.score).toBe(1);
  });

  it("kiest bij Qwixx het basisspel en niet een uitbreiding", () => {
    expect(pickBestBggMatch("Qwixx", qwixxHits)?.hit.id).toBe(131260);
  });

  it("kiest bij Uno de oudste uitgave via de id-tiebreak", () => {
    expect(pickBestBggMatch("Uno", unoHits)?.hit.id).toBe(2223);
  });

  it("straft extra woorden in de kandidaat af", () => {
    const base = scoreBggCandidate("Qwixx", {
      id: 1,
      name: "Qwixx",
      yearPublished: 2012,
      isPrimary: true,
    });
    const expansion = scoreBggCandidate("Qwixx", {
      id: 2,
      name: "Qwixx: Big Points",
      yearPublished: 2014,
      isPrimary: true,
    });
    expect(base).toBeGreaterThan(expansion);
  });

  it("geeft voorrang aan de primaire naam boven een alternatieve", () => {
    const primary = scoreBggCandidate("Azul", {
      id: 1,
      name: "Azul",
      yearPublished: 2017,
      isPrimary: true,
    });
    const alternate = scoreBggCandidate("Azul", {
      id: 2,
      name: "Azul",
      yearPublished: 2017,
      isPrimary: false,
    });
    expect(primary).toBeGreaterThan(alternate);
  });

  it("geeft null als geen enkele kandidaat boven de drempel komt", () => {
    const hits = [
      { id: 1, name: "Terraforming Mars", yearPublished: 2016, isPrimary: true },
    ];
    expect(pickBestBggMatch("Vlotte geesten", hits)).toBeNull();
  });

  it("geeft null bij een lege trefferlijst", () => {
    expect(pickBestBggMatch("Mozaa", [])).toBeNull();
  });

  it("markeert de match als twijfelachtig bij twee bijna gelijke scores", () => {
    const hits = [
      { id: 10, name: "Beverbende", yearPublished: 2018, isPrimary: true },
      { id: 11, name: "Beverbende", yearPublished: 2019, isPrimary: true },
    ];
    expect(pickBestBggMatch("Beverbende", hits)?.ambiguous).toBe(true);
  });

  it("markeert een duidelijke winnaar niet als twijfelachtig", () => {
    expect(pickBestBggMatch("Qwixx", qwixxHits)?.ambiguous).toBe(false);
  });

  it("gebruikt de handmatige id-override voor Uno", () => {
    const shuffled = [...unoHits].reverse();
    const match = pickBestBggMatch("uno", shuffled);
    expect(match?.hit.id).toBe(2223);
    expect(match?.score).toBe(1);
  });
});

describe("rankBggCandidates", () => {
  it("geeft maximaal vijf kandidaten terug, hoogste score eerst", () => {
    const ranked = rankBggCandidates("Qwixx", qwixxHits);
    expect(ranked.length).toBeLessThanOrEqual(5);
    expect(ranked[0]?.hit.id).toBe(131260);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    }
  });

  it("respecteert de opgegeven limiet", () => {
    expect(rankBggCandidates("Qwixx", qwixxHits, 2)).toHaveLength(2);
  });
});
