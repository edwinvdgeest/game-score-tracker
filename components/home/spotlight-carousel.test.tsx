// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { SpotlightCard as SpotlightCardData } from "@/lib/spotlight";
import { SpotlightCarousel } from "./spotlight-carousel";

afterEach(cleanup);

function card(id: string, title: string): SpotlightCardData {
  return {
    id,
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
    render(<SpotlightCarousel cards={CARDS} onReplay={() => {}} />);
    expect(screen.getByText("Een jaar geleden speelden jullie…")).toBeDefined();
    expect(screen.queryByText("Jullie laatste potjes")).toBeNull();
  });

  it("bladert met de volgende-knop naar de tweede kaart", () => {
    render(<SpotlightCarousel cards={CARDS} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Volgende kaart"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("springt met een stip naar een kaart", () => {
    render(<SpotlightCarousel cards={CARDS} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Kaart 2: Jullie laatste potjes"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("bladert rond bij de vorige-knop op de eerste kaart", () => {
    render(<SpotlightCarousel cards={CARDS} onReplay={() => {}} />);
    fireEvent.click(screen.getByLabelText("Vorige kaart"));
    expect(screen.getByText("Jullie laatste potjes")).toBeDefined();
  });

  it("geeft het spel-id door als je op Nog eens? tikt", () => {
    const onReplay = vi.fn();
    render(<SpotlightCarousel cards={CARDS} onReplay={onReplay} />);
    fireEvent.click(screen.getByLabelText("Rummikub nu spelen"));
    expect(onReplay).toHaveBeenCalledWith("g1");
  });

  it("toont geen bladerknoppen bij één kaart", () => {
    render(<SpotlightCarousel cards={[CARDS[0] as SpotlightCardData]} onReplay={() => {}} />);
    expect(screen.queryByLabelText("Volgende kaart")).toBeNull();
  });

  it("rendert niets zonder kaarten", () => {
    const { container } = render(<SpotlightCarousel cards={[]} onReplay={() => {}} />);
    expect(container.textContent).toBe("");
  });
});
