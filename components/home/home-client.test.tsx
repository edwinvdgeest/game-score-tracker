// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Game, Player } from "@/lib/schemas";
import type { GameRecap, SpotlightCard } from "@/lib/spotlight";
import { HomeClient } from "./home-client";

/**
 * Deze test dekt het gedrag waar de spotlight om begon: op "Nog eens?" tikken moet het spel
 * in het formulier zetten (zonder paginaherlaad) en de kaart moet omschakelen naar de laatste
 * uitslagen van dat spel.
 */

const GAME = {
  id: "g1",
  name: "Rummikub",
  emoji: "🔢",
  category: "bordspel",
  min_players: 2,
  max_players: 4,
  created_at: "2026-01-01T00:00:00.000Z",
  lowest_score_wins: false,
} as unknown as Game;

const PLAYERS = [
  { id: "edwin", name: "Edwin", emoji: "🎯", is_active: true },
  { id: "lisanne", name: "Lisanne", emoji: "🌟", is_active: true },
] as unknown as Player[];

const SPOTLIGHT: SpotlightCard[] = [
  {
    id: "memory-1y",
    emoji: "🕰️",
    title: "Een jaar geleden speelden jullie…",
    tone: "lavender",
    entries: [
      {
        emoji: "🔢",
        title: "Rummikub",
        subtitle: "30 juli 2025 · 🎯 Edwin won",
        scores: [{ emoji: "🎯", score: 80, isWinner: true }],
        note: null,
        replayGame: { id: "g1", name: "Rummikub", emoji: "🔢" },
      },
    ],
  },
];

const RECAP: GameRecap = {
  game: { id: "g1", name: "Rummikub", emoji: "🔢", lowest_score_wins: false },
  totalSessions: 4,
  lastPlayedAt: "2026-07-20T18:00:00.000Z",
  avgDurationMinutes: 35,
  standings: [
    {
      player: { id: "edwin", name: "Edwin", emoji: "🎯" },
      wins: 3,
      played: 4,
      winPercentage: 75,
    },
  ],
  record: {
    score: 92,
    player: { id: "edwin", name: "Edwin", emoji: "🎯" },
    played_at: "2026-07-20T18:00:00.000Z",
    lowestWins: false,
  },
  entries: [
    {
      emoji: "🔢",
      title: "Rummikub",
      subtitle: "20 juli 2026 · 🎯 Edwin won",
      scores: [{ emoji: "🎯", score: 92, isWinner: true }],
      note: null,
      replayGame: { id: "g1", name: "Rummikub", emoji: "🔢" },
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const body = input.includes("/recap") ? RECAP : null;
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HomeClient", () => {
  it("wisselt van terugblik naar de uitslagen van het gekozen spel", async () => {
    render(<HomeClient games={[GAME]} players={PLAYERS} spotlight={SPOTLIGHT} />);

    expect(screen.getByText("Een jaar geleden speelden jullie…")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Rummikub nu spelen"));

    // Het formulier staat nu op de beginnersvraag…
    expect(screen.getByText("Wie begon? 🎲")).toBeDefined();
    // …en de kaart hoort bij het gekozen spel.
    expect(await screen.findByText("Laatste uitslagen · Rummikub")).toBeDefined();
    expect(screen.getByText(/meestal ~35 min/)).toBeDefined();
  });
});
