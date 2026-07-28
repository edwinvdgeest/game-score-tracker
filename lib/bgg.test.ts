import { describe, it, expect } from "vitest";
import {
  parseBggSearchXml,
  parseBggThingXml,
  buildBggSearchUrl,
  buildBggThingUrl,
  bggGamePageUrl,
} from "@/lib/bgg";
import {
  SEARCH_XML_QWIXX,
  SEARCH_XML_UNO,
  SEARCH_XML_ENTITIES,
  SEARCH_XML_NO_YEAR,
  SEARCH_XML_EMPTY,
  THING_XML_QWIXX,
  THING_XML_MINIMAL,
  THING_XML_NO_ITEM,
} from "@/lib/bgg.fixtures";

describe("parseBggSearchXml", () => {
  it("leest alle treffers uit een zoekresultaat", () => {
    const hits = parseBggSearchXml(SEARCH_XML_QWIXX);
    expect(hits).toHaveLength(4);
    expect(hits[0]).toEqual({
      id: 131260,
      name: "Qwixx",
      yearPublished: 2012,
      isPrimary: true,
    });
  });

  it("geeft een lege lijst bij nul treffers", () => {
    expect(parseBggSearchXml(SEARCH_XML_EMPTY)).toEqual([]);
  });

  it("decodeert HTML-entiteiten in de naam", () => {
    const hits = parseBggSearchXml(SEARCH_XML_ENTITIES);
    expect(hits[0]?.name).toBe("Hey, That's My Fish!");
  });

  it("decodeert numerieke entiteiten voor diakritische tekens", () => {
    const hits = parseBggSearchXml(SEARCH_XML_ENTITIES);
    expect(hits[1]?.name).toBe("Thurn und Taxis: Glück & Glas");
  });

  it("geeft null voor een ontbrekend jaartal", () => {
    const hits = parseBggSearchXml(SEARCH_XML_NO_YEAR);
    expect(hits[0]?.yearPublished).toBeNull();
  });

  it("markeert een alternatieve naam niet als primair", () => {
    const hits = parseBggSearchXml(SEARCH_XML_QWIXX);
    const deluxe = hits.find((h) => h.id === 286480);
    expect(deluxe?.isPrimary).toBe(false);
  });

  it("houdt heruitgaven met dezelfde naam als losse treffers", () => {
    const hits = parseBggSearchXml(SEARCH_XML_UNO);
    expect(hits.filter((h) => h.name === "Uno")).toHaveLength(2);
  });
});

describe("parseBggThingXml", () => {
  it("haalt afbeelding, thumbnail en speelduur op", () => {
    const thing = parseBggThingXml(THING_XML_QWIXX);
    expect(thing?.imageUrl).toBe("https://cf.geekdo-images.com/abc/img/original/pic1804000.jpg");
    expect(thing?.thumbnailUrl).toBe("https://cf.geekdo-images.com/abc/img/thumb/pic1804000.jpg");
    expect(thing?.playingTimeMinutes).toBe(15);
  });

  it("kiest de primaire naam, ook als die niet vooraan staat", () => {
    const thing = parseBggThingXml(THING_XML_QWIXX);
    expect(thing?.name).toBe("Qwixx");
  });

  it("rondt de BGG-rating af op één decimaal", () => {
    const thing = parseBggThingXml(THING_XML_QWIXX);
    expect(thing?.rating).toBe(7);
    expect(thing?.weight).toBe(1.22);
  });

  it("geeft null terug als er geen item in de XML zit", () => {
    expect(parseBggThingXml(THING_XML_NO_ITEM)).toBeNull();
  });

  it("laat rating en gewicht null als statistics ontbreekt", () => {
    const thing = parseBggThingXml(THING_XML_MINIMAL);
    expect(thing?.rating).toBeNull();
    expect(thing?.weight).toBeNull();
  });

  it("behandelt een speelduur van 0 minuten als onbekend", () => {
    const thing = parseBggThingXml(THING_XML_MINIMAL);
    expect(thing?.playingTimeMinutes).toBeNull();
  });

  it("behandelt jaartal 0 als onbekend", () => {
    const thing = parseBggThingXml(THING_XML_MINIMAL);
    expect(thing?.yearPublished).toBeNull();
  });
});

describe("url-bouwers", () => {
  it("url-encodeert spaties en leestekens in de zoekterm", () => {
    const url = buildBggSearchUrl("Hey, That's My Fish!", "https://example.test/xmlapi2");
    expect(url).toBe(
      "https://example.test/xmlapi2/search?query=Hey%2C%20That's%20My%20Fish!&type=boardgame"
    );
  });

  it("vraagt statistieken mee op bij een thing-verzoek", () => {
    expect(buildBggThingUrl(131260, "https://example.test/xmlapi2")).toBe(
      "https://example.test/xmlapi2/thing?id=131260&stats=1"
    );
  });

  it("bouwt een publieke BGG-pagina-link", () => {
    expect(bggGamePageUrl(131260)).toBe("https://boardgamegeek.com/boardgame/131260");
  });
});
