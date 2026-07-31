import { describe, it, expect } from "vitest";
import { shouldGenerateText, resolveInheritedMetadata } from "@/lib/game-metadata";

const GEEKDO = "https://cf.geekdo-images.com/abc/img/original/pic1.jpg";

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
