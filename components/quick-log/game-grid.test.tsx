// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Game } from "@/lib/schemas";
import { GameGrid } from "./game-grid";

afterEach(cleanup);

function game(name: string, min: number, max: number): Game {
  return {
    id: name,
    name,
    emoji: "🎲",
    category: "bordspel",
    min_players: min,
    max_players: max,
    created_at: "2026-01-01T00:00:00.000Z",
  } as unknown as Game;
}

const DUO = game("Duel", 2, 2);
const GROEP = game("Groepsspel", 3, 6);
const ONBEKEND = { ...game("Zonder grenzen", 0, 0), min_players: 0, max_players: 0 } as Game;

describe("GameGrid met bezettingsfilter", () => {
  it("verbergt spellen die niet bij het aantal spelers passen", () => {
    render(
      <GameGrid
        games={[DUO, GROEP]}
        selectedGameId={null}
        onSelect={() => {}}
        playerCount={2}
      />
    );

    expect(screen.getByText("Duel")).toBeDefined();
    expect(screen.queryByText("Groepsspel")).toBeNull();
    expect(screen.getByText(/1 verborgen/)).toBeDefined();
  });

  it("toont alles weer als je de chip uitzet", () => {
    render(
      <GameGrid
        games={[DUO, GROEP]}
        selectedGameId={null}
        onSelect={() => {}}
        playerCount={2}
      />
    );

    fireEvent.click(screen.getByText(/Past bij 2 spelers/));

    expect(screen.getByText("Groepsspel")).toBeDefined();
    expect(screen.getByText(/alles zichtbaar/)).toBeDefined();
  });

  it("laat spellen zonder spelersgrenzen altijd staan", () => {
    render(
      <GameGrid
        games={[GROEP, ONBEKEND]}
        selectedGameId={null}
        onSelect={() => {}}
        playerCount={2}
      />
    );

    expect(screen.getByText("Zonder grenzen")).toBeDefined();
    expect(screen.queryByText("Groepsspel")).toBeNull();
  });

  it("houdt het raster volledig als het filter alles zou wegvegen", () => {
    render(
      <GameGrid games={[GROEP]} selectedGameId={null} onSelect={() => {}} playerCount={2} />
    );

    expect(screen.getByText("Groepsspel")).toBeDefined();
    expect(screen.queryByText(/Past bij 2 spelers/)).toBeNull();
  });

  it("zoekt door alles heen, ook buiten de bezetting", () => {
    render(
      <GameGrid
        games={[DUO, GROEP]}
        selectedGameId={null}
        onSelect={() => {}}
        playerCount={2}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Zoek spel..."), {
      target: { value: "groep" },
    });

    expect(screen.getByText("Groepsspel")).toBeDefined();
    expect(screen.queryByText("Duel")).toBeNull();
  });

  it("filtert niet zonder bekend aantal spelers", () => {
    render(<GameGrid games={[DUO, GROEP]} selectedGameId={null} onSelect={() => {}} />);

    expect(screen.getByText("Duel")).toBeDefined();
    expect(screen.getByText("Groepsspel")).toBeDefined();
  });

  it("geeft het gekozen spel door", () => {
    const onSelect = vi.fn();
    render(
      <GameGrid games={[DUO]} selectedGameId={null} onSelect={onSelect} playerCount={2} />
    );

    fireEvent.click(screen.getByText("Duel"));
    expect(onSelect).toHaveBeenCalledWith(DUO);
  });
});
