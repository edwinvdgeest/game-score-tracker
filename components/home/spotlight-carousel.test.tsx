// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { SpotlightCard as SpotlightCardData, SpotlightKind } from "@/lib/spotlight";
import { activeDemotions, getPrefsSnapshot, resetPrefsForTest } from "@/lib/spotlight-prefs";
import { SpotlightCarousel } from "./spotlight-carousel";

beforeEach(resetPrefsForTest);
afterEach(() => {
  cleanup();
  resetPrefsForTest();
});

function card(
  id: string,
  title: string,
  kind: SpotlightKind = id.startsWith("memory") ? "memory" : "recent"
): SpotlightCardData {
  return {
    id,
    kind,
    emoji: "🎲",
    title,
    tone: "mint",
    entries: [
      {
        emoji: "🔢",
        title: "Rummikub",
        subtitle: "30 juli 2026 · 🎯 Edwin won",
        scores: [{ emoji: "🎯", score: 80, isWinner: true }],
        note: null,
        replayGame: { id: "g1", name: "Rummikub", emoji: "🔢" },
      },
    ],
  };
}

const CARDS = [
  card("memory-1y", "Een jaar geleden speelden jullie…"),
  card("recent", "Jullie laatste potjes"),
];

describe("SpotlightCarousel", () => {
  it("toont de eerste kaart", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);
    expect(screen.getByText("Een jaar geleden speelden jullie…")).toBeDefined();
    expect(screen.queryByText("Jullie laatste potjes")).toBeNull();
  });

  it("bladert met de volgende-knop naar de tweede kaart", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Volgende kaart"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("springt met een stip naar een kaart", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Kaart 2: Jullie laatste potjes"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("bladert rond bij de vorige-knop op de eerste kaart", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Vorige kaart"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("geeft het spel-id door als je op Nog eens? tikt", () => {
    const onReplay = vi.fn();
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={onReplay} />);
    fireEvent.click(screen.getByLabelText("Rummikub nu spelen"));
    expect(onReplay).toHaveBeenCalledWith("g1");
  });

  it("toont geen bladerknoppen bij één kaart", () => {
    render(<SpotlightCarousel cards={[CARDS[0] as SpotlightCardData]} seed={0} onReplay={() => {}} />);
    expect(screen.queryByLabelText("Volgende kaart")).toBeNull();
  });


  it("begint op de terugblik van precies vandaag", () => {
    const cards = [
      card("recent", "Jullie laatste potjes"),
      { ...card("memory-2y", "Vandaag 2 jaar geleden speelden jullie…"), exactDay: true },
    ];
    render(<SpotlightCarousel cards={cards} seed={0} onReplay={() => {}} />);

    expect(screen.getByText("Vandaag 2 jaar geleden speelden jullie…")).toBeDefined();
  });

  it("onthoudt 'minder van dit' en bladert door naar een andere kaart", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);

    fireEvent.click(screen.getByLabelText('Minder kaarten als "Een jaar geleden speelden jullie…"'));

    expect(activeDemotions(getPrefsSnapshot(), new Date())).toEqual(["memory"]);
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
    expect(screen.getByText("alles terug")).toBeDefined();
  });

  it("zet alles terug met de herstelknop", () => {
    render(<SpotlightCarousel cards={CARDS} seed={0} onReplay={() => {}} />);

    fireEvent.click(screen.getByLabelText('Minder kaarten als "Een jaar geleden speelden jullie…"'));
    fireEvent.click(screen.getByText("alles terug"));

    expect(activeDemotions(getPrefsSnapshot(), new Date())).toEqual([]);
    expect(screen.queryByText("alles terug")).toBeNull();
  });

  it("laat een tip weg die niet bij de bezetting past", () => {
    const dust = card("dust", "Staat al even stil", "dust");
    const cards = [
      {
        ...dust,
        entries: [
          { ...(dust.entries[0] as SpotlightCardData["entries"][number]), title: "Voor zes", playerRange: { min: 5, max: 6 } },
        ],
      },
      card("recent", "Jullie laatste potjes"),
    ];

    render(<SpotlightCarousel cards={cards} seed={0} playerCount={2} onReplay={() => {}} />);

    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
    expect(screen.queryByText("Staat al even stil")).toBeNull();
  });

  it("rendert niets zonder kaarten", () => {
    const { container } = render(<SpotlightCarousel cards={[]} seed={0} onReplay={() => {}} />);
    expect(container.textContent).toBe("");
  });
});
