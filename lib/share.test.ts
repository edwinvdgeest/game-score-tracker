import { describe, it, expect } from "vitest";
import { formatShareText } from "@/lib/share";

const RUMMIKUB = { name: "Rummikub", emoji: "🔢" };
const EDWIN = { name: "Edwin", emoji: "🎯" };
const LISANNE = { name: "Lisanne", emoji: "🌟" };

describe("formatShareText", () => {
  it("zet de winnaar vooraan in de scores en achteraan in de uitslag", () => {
    const text = formatShareText({
      game: RUMMIKUB,
      participants: [
        { ...LISANNE, score: 70 },
        { ...EDWIN, score: 84 },
      ],
      winner: EDWIN,
      playedAt: "2026-07-30T18:00:00.000Z",
    });

    expect(text).toBe(
      "🔢 Rummikub — 🎯 Edwin 84 · 🌟 Lisanne 70 — 🎯 Edwin wint! (30 juli 2026)"
    );
  });

  it("keert de volgorde om als de laagste score wint", () => {
    const text = formatShareText({
      game: { name: "Golf", emoji: "⛳" },
      participants: [
        { ...EDWIN, score: 95 },
        { ...LISANNE, score: 61 },
      ],
      winner: LISANNE,
      playedAt: "2026-07-30T18:00:00.000Z",
      lowestScoreWins: true,
    });

    expect(text).toContain("🌟 Lisanne 61 · 🎯 Edwin 95");
  });

  it("noemt gelijkspel", () => {
    const text = formatShareText({
      game: RUMMIKUB,
      participants: [
        { ...EDWIN, score: 70 },
        { ...LISANNE, score: 70 },
      ],
      winner: null,
      playedAt: "2026-07-30T18:00:00.000Z",
    });

    expect(text).toContain("🤝 Gelijkspel!");
  });

  it("zet een streepje bij een speler zonder score, en die achteraan", () => {
    const text = formatShareText({
      game: RUMMIKUB,
      participants: [
        { ...EDWIN, score: null },
        { ...LISANNE, score: 70 },
      ],
      winner: LISANNE,
      playedAt: "2026-07-30T18:00:00.000Z",
    });

    expect(text).toContain("🌟 Lisanne 70 · 🎯 Edwin –");
  });
});
