// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Player } from "@/lib/schemas";
import type { RoundConfig } from "@/lib/rounds";
import { RoundEntry } from "./round-entry";

/**
 * Getest wordt het gedrag dat mis kan gaan: einde-detectie bij een grens, de winnaar-vorm
 * die 1/0 wegschrijft, en het corrigeren van een ronde die je al ingevuld had. De opmaak
 * en de duur/notitie-velden blijven buiten beschouwing.
 */

const PLAYERS = [
  { id: "edwin", name: "Edwin", emoji: "🎯", is_active: true },
  { id: "lisanne", name: "Lisanne", emoji: "🌟", is_active: true },
] as unknown as Player[];

/** Wrapper die de rondes vasthoudt, zoals session-form dat doet. */
function Harness({
  config,
  lowestScoreWins = false,
  onSave = () => {},
}: {
  config: RoundConfig;
  lowestScoreWins?: boolean;
  onSave?: () => void;
}) {
  const [rounds, setRounds] = useState<Array<Record<string, string>>>([]);
  return (
    <RoundEntry
      players={PLAYERS}
      config={config}
      lowestScoreWins={lowestScoreWins}
      rounds={rounds}
      onRoundsChange={setRounds}
      onSave={onSave}
      saving={false}
      duration={null}
      onDurationChange={() => {}}
      note=""
      onNoteChange={() => {}}
    />
  );
}

/** Vul een ronde in en sla 'm op. */
function speelRonde(edwin: string, lisanne: string, rondeNummer: number) {
  fireEvent.change(screen.getByLabelText(`Punten Edwin ronde ${rondeNummer}`), {
    target: { value: edwin },
  });
  fireEvent.change(screen.getByLabelText(`Punten Lisanne ronde ${rondeNummer}`), {
    target: { value: lisanne },
  });
  fireEvent.click(screen.getByText(/Ronde opslaan/));
}

afterEach(cleanup);

describe("RoundEntry — spelen tot een grens", () => {
  const config: RoundConfig = { format: "grens", count: null, target: 66 };

  it("meldt pas dat het potje klaar is als iemand de grens haalt", () => {
    render(<Harness config={config} lowestScoreWins />);

    speelRonde("40", "12", 1);
    expect(screen.queryByText(/grens van 66 is gehaald/)).toBeNull();

    speelRonde("31", "9", 2);
    expect(screen.getByText(/grens van 66 is gehaald/)).toBeDefined();
  });

  it("markeert wie over de grens is en houdt de tussenstand bij", () => {
    render(<Harness config={config} lowestScoreWins />);

    speelRonde("70", "12", 1);

    expect(screen.getByText("70/66")).toBeDefined();
    expect(screen.getByText("12/66")).toBeDefined();
    expect(screen.getByLabelText("over de grens")).toBeDefined();
  });

  it("laat je dóórspelen nadat de grens gehaald is", () => {
    render(<Harness config={config} lowestScoreWins />);

    speelRonde("70", "12", 1);
    fireEvent.click(screen.getByText("Toch nog een ronde"));

    expect(screen.getByLabelText("Punten Edwin ronde 2")).toBeDefined();
  });
});

describe("RoundEntry — vast aantal rondes", () => {
  it("telt de rondes mee in de kop en meldt het einde na de laatste", () => {
    render(<Harness config={{ format: "vast", count: 2, target: null }} />);

    expect(screen.getByText("Ronde 1 van 2")).toBeDefined();
    speelRonde("20", "30", 1);
    expect(screen.getByText("Ronde 2 van 2")).toBeDefined();

    speelRonde("40", "-10", 2);
    expect(screen.getByText(/Alle rondes gespeeld/)).toBeDefined();
    // 20+40 = 60 tegen 30-10 = 20
    expect(screen.getByText("60")).toBeDefined();
    expect(screen.getByText("20")).toBeDefined();
  });
});

describe("RoundEntry — rondes met een winnaar", () => {
  it("houdt de stand bij op gewonnen rondes", () => {
    render(<Harness config={{ format: "winnaar", count: null, target: null }} />);

    fireEvent.click(screen.getByText("Edwin won"));
    fireEvent.click(screen.getByText("Lisanne won"));
    fireEvent.click(screen.getByText("Edwin won"));

    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
    // In de rondelijst staat per speler een 🏆 of een streepje: 2 rondes voor Edwin,
    // 1 voor Lisanne.
    expect(screen.getAllByText("🎯🏆")).toHaveLength(2);
    expect(screen.getAllByText("🌟🏆")).toHaveLength(1);
  });
});

describe("RoundEntry — corrigeren", () => {
  it("werkt het totaal bij als je een eerdere ronde aanpast", () => {
    render(<Harness config={{ format: "vrij", count: null, target: null }} />);

    speelRonde("10", "5", 1);
    speelRonde("10", "5", 2);
    expect(screen.getByText("20")).toBeDefined();

    // Terug naar ronde 1 en die corrigeren.
    fireEvent.click(screen.getByLabelText("Ronde 1 aanpassen"));
    fireEvent.change(screen.getByLabelText("Punten Edwin ronde 1"), {
      target: { value: "3" },
    });

    expect(screen.getByText("13")).toBeDefined();
  });

  it("hernummert de rondes als je er een verwijdert", () => {
    render(<Harness config={{ format: "vrij", count: null, target: null }} />);

    speelRonde("10", "5", 1);
    speelRonde("7", "2", 2);
    fireEvent.click(screen.getByLabelText("Ronde 1 verwijderen"));

    // Wat ronde 2 was is nu ronde 1, en het totaal telt alleen die nog.
    expect(screen.getByLabelText("Ronde 1 aanpassen")).toBeDefined();
    expect(screen.queryByLabelText("Ronde 2 aanpassen")).toBeNull();
    expect(screen.getByText("7")).toBeDefined();
  });
});

describe("RoundEntry — afronden", () => {
  it("kan pas klaar zijn als er een ronde gespeeld is", () => {
    render(<Harness config={{ format: "vrij", count: null, target: null }} />);

    const klaar = screen.getByText("Klaar 🎉") as HTMLButtonElement;
    expect(klaar.disabled).toBe(true);

    speelRonde("10", "5", 1);
    expect((screen.getByText("Klaar 🎉") as HTMLButtonElement).disabled).toBe(false);
  });

  it("slaat op vanuit het afrondscherm", () => {
    const onSave = vi.fn();
    render(<Harness config={{ format: "vrij", count: null, target: null }} onSave={onSave} />);

    speelRonde("10", "5", 1);
    fireEvent.click(screen.getByText("Klaar 🎉"));

    expect(screen.getByText("Klopt de eindstand? 🎯")).toBeDefined();
    fireEvent.click(screen.getByText("Opslaan 🎉"));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
