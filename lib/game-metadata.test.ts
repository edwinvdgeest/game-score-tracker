import { describe, it, expect } from "vitest";
import {
  stripBggHtml,
  isAllowedImageHost,
  mapBggThingToGameMetadata,
  shouldGenerateText,
  enrichCooldownRemainingMs,
  resolveInheritedMetadata,
  ENRICH_COOLDOWN_MS,
} from "@/lib/game-metadata";
import { parseBggThingXml } from "@/lib/bgg";
import { THING_XML_QWIXX, THING_XML_MINIMAL } from "@/lib/bgg.fixtures";

const GEEKDO = "https://cf.geekdo-images.com/abc/img/original/pic1.jpg";

describe("stripBggHtml", () => {
  it("zet een numerieke entiteit om naar een echt teken", () => {
    expect(stripBggHtml("regel een&#10;regel twee")).toBe("regel een\nregel twee");
  });

  it("verwijdert HTML-tags", () => {
    expect(stripBggHtml("een <b>vet</b> spel")).toBe("een vet spel");
  });

  it("zet een br-tag om naar een regelovergang", () => {
    expect(stripBggHtml("boven<br/>onder")).toBe("boven\nonder");
  });

  it("kort in op een woordgrens en zet er een beletselteken achter", () => {
    const result = stripBggHtml("een twee drie vier vijf", 12);
    expect(result).toBe("een twee…");
  });

  it("laat korte tekst ongemoeid", () => {
    expect(stripBggHtml("kort", 100)).toBe("kort");
  });
});

describe("isAllowedImageHost", () => {
  it("accepteert cf.geekdo-images.com", () => {
    expect(isAllowedImageHost(GEEKDO)).toBe(true);
  });

  it("accepteert images.boardgamegeek.com", () => {
    expect(isAllowedImageHost("https://images.boardgamegeek.com/x.jpg")).toBe(true);
  });

  it("weigert een onbekende host", () => {
    expect(isAllowedImageHost("https://example.invalid/x.jpg")).toBe(false);
  });

  it("weigert http zonder tls", () => {
    expect(isAllowedImageHost("http://cf.geekdo-images.com/x.jpg")).toBe(false);
  });

  it("weigert null", () => {
    expect(isAllowedImageHost(null)).toBe(false);
  });

  it("weigert een onzinnige url", () => {
    expect(isAllowedImageHost("geen url")).toBe(false);
  });
});

describe("mapBggThingToGameMetadata", () => {
  it("neemt afbeelding en feiten over en wist de foutmelding", () => {
    const thing = parseBggThingXml(THING_XML_QWIXX)!;
    const patch = mapBggThingToGameMetadata(thing);
    expect(patch.bgg_id).toBe(131260);
    expect(patch.image_url).toContain("cf.geekdo-images.com");
    expect(patch.playing_time_minutes).toBe(15);
    expect(patch.bgg_sync_error).toBeNull();
  });

  it("laat de afbeelding null bij een niet-toegestane host", () => {
    const thing = parseBggThingXml(THING_XML_QWIXX)!;
    const patch = mapBggThingToGameMetadata({
      ...thing,
      imageUrl: "https://example.invalid/x.jpg",
      thumbnailUrl: null,
    });
    expect(patch.image_url).toBeNull();
  });

  it("laat speelduur null als BGG 0 teruggeeft", () => {
    const thing = parseBggThingXml(THING_XML_MINIMAL)!;
    expect(mapBggThingToGameMetadata(thing).playing_time_minutes).toBeNull();
  });
});

describe("shouldGenerateText", () => {
  const leeg = {
    description: null,
    rules_summary: null,
    text_locked: false,
    text_source: null,
  } as const;

  it("genereert als beide tekstvelden leeg zijn", () => {
    expect(shouldGenerateText(leeg)).toBe(true);
  });

  it("slaat over als de tekst handmatig is aangepast", () => {
    expect(shouldGenerateText({ ...leeg, text_locked: true })).toBe(false);
  });

  it("slaat over als de seed-tekst er al staat", () => {
    expect(shouldGenerateText({ ...leeg, text_source: "seed" })).toBe(false);
  });

  it("slaat over als beide velden al gevuld zijn", () => {
    expect(
      shouldGenerateText({ ...leeg, description: "iets", rules_summary: "iets" })
    ).toBe(false);
  });

  it("slaat over als het hoofdspel de tekst al levert", () => {
    expect(
      shouldGenerateText(leeg, { description: "van de parent", rules_summary: "ook" })
    ).toBe(false);
  });

  it("genereert wel als het hoofdspel zelf geen tekst heeft", () => {
    expect(shouldGenerateText(leeg, { description: null, rules_summary: null })).toBe(true);
  });
});

describe("enrichCooldownRemainingMs", () => {
  const now = new Date("2026-07-28T12:00:00Z");

  it("geeft 0 als er nog nooit gesynchroniseerd is", () => {
    expect(enrichCooldownRemainingMs(null, now)).toBe(0);
  });

  it("geeft 0 als de cooldown verstreken is", () => {
    expect(enrichCooldownRemainingMs("2026-07-28T11:00:00Z", now)).toBe(0);
  });

  it("geeft de resterende tijd binnen de cooldown", () => {
    const remaining = enrichCooldownRemainingMs("2026-07-28T11:56:00Z", now);
    expect(remaining).toBe(ENRICH_COOLDOWN_MS - 4 * 60 * 1000);
  });

  it("geeft 0 bij een onleesbare datum", () => {
    expect(enrichCooldownRemainingMs("geen datum", now)).toBe(0);
  });
});

describe("resolveInheritedMetadata", () => {
  const parent = {
    id: "p1",
    name: "Qwixx",
    emoji: "😃",
    image_url: GEEKDO,
    thumbnail_url: "https://cf.geekdo-images.com/abc/img/thumb/pic1.jpg",
    description: "Snel dobbelspel.",
    rules_summary: "Doel: ...",
  };

  const variant = {
    image_url: null,
    thumbnail_url: null,
    description: null,
    rules_summary: null,
  };

  it("laat een variant de doosfoto van het hoofdspel erven", () => {
    const resolved = resolveInheritedMetadata(variant, parent);
    expect(resolved.imageUrl).toBe(GEEKDO);
    expect(resolved.inheritedFromParent).toBe(true);
  });

  it("laat een variant de omschrijving van het hoofdspel erven", () => {
    expect(resolveInheritedMetadata(variant, parent).description).toBe("Snel dobbelspel.");
  });

  it("geeft eigen gegevens voorrang op die van het hoofdspel", () => {
    const eigen = { ...variant, description: "Eigen tekst." };
    expect(resolveInheritedMetadata(eigen, parent).description).toBe("Eigen tekst.");
  });

  it("markeert niets als geërfd wanneer er geen hoofdspel is", () => {
    const resolved = resolveInheritedMetadata(variant, null);
    expect(resolved.imageUrl).toBeNull();
    expect(resolved.inheritedFromParent).toBe(false);
  });

  it("markeert niets als geërfd wanneer het spel alles zelf heeft", () => {
    const compleet = {
      image_url: GEEKDO,
      thumbnail_url: GEEKDO,
      description: "Eigen.",
      rules_summary: "Eigen.",
    };
    expect(resolveInheritedMetadata(compleet, parent).inheritedFromParent).toBe(false);
  });
});
