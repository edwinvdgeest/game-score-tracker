"use client";

import { useMemo, useState } from "react";
import type { Player } from "@/lib/schemas";
import {
  isSessionComplete,
  parseRoundEntries,
  playersOverTarget,
  sumRounds,
  type RoundConfig,
} from "@/lib/rounds";
import { computeWinner } from "@/lib/stats";
import { SessionExtras } from "./session-extras";
import { cn } from "@/lib/utils";

interface RoundEntryProps {
  players: Player[];
  config: RoundConfig;
  lowestScoreWins: boolean;
  /** De ingevulde rondes: rounds[i] is ronde i+1, per speler-id de ruwe tekst. */
  rounds: Array<Record<string, string>>;
  onRoundsChange: (rounds: Array<Record<string, string>>) => void;
  onSave: () => void;
  /** Dit potje toch zonder rondes loggen: door naar één totaal per speler. */
  onSkipRounds: () => void;
  saving: boolean;
  duration: number | null;
  onDurationChange: (mins: number | null) => void;
  note: string;
  onNoteChange: (value: string) => void;
}

/**
 * Rondes invullen, voor alle vier de rondevormen.
 *
 * Staat los van score-entry omdat de twee schermen structureel niets delen: daar is het
 * één invoer per speler, hier een raster met lopende totalen, einde-detectie en het
 * corrigeren van een eerdere ronde.
 *
 * De bevestiging ("klaar, dit is de eindstand") is bewust interne state en géén extra
 * wizard-stap: zo blijven terug en swipe-rechts betekenen wat ze altijd betekenden.
 */
export function RoundEntry({
  players,
  config,
  lowestScoreWins,
  rounds,
  onRoundsChange,
  onSave,
  onSkipRounds,
  saving,
  duration,
  onDurationChange,
  note,
  onNoteChange,
}: RoundEntryProps) {
  const [phase, setPhase] = useState<"spelen" | "afronden">("spelen");
  /** De ronde die je nu invult; staat los van `rounds` tot je 'm opslaat. */
  const [draft, setDraft] = useState<Record<string, string>>({});
  /** null = de draft is een nieuwe ronde; een getal = je corrigeert die bestaande ronde. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const isWinnerFormat = config.format === "winnaar";

  /**
   * De rondes inclusief wat er nu ingetikt wordt, zodat de tussenstand meteen meeloopt.
   * Bij een nieuwe ronde komt de draft erachteraan, bij een correctie vervangt hij de
   * ronde die je aan het aanpassen bent.
   */
  const effectiveRounds = useMemo(
    () =>
      editingIndex === null
        ? [...rounds, draft]
        : rounds.map((round, i) => (i === editingIndex ? draft : round)),
    [rounds, draft, editingIndex]
  );

  const totals = useMemo(
    () => sumRounds(playerIds, parseRoundEntries(playerIds, effectiveRounds)),
    [playerIds, effectiveRounds]
  );
  const totalById = useMemo(
    () => new Map(totals.map((t) => [t.player_id, t.score])),
    [totals]
  );

  const complete = isSessionComplete(config, totals, rounds.length);
  const overTarget = playersOverTarget(config, totals);
  const leaderId = computeWinner(totals, lowestScoreWins);

  /** Het nummer van de ronde die nu op het scherm staat, 1-gebaseerd. */
  const currentNumber = (editingIndex ?? rounds.length) + 1;

  const setValue = (playerId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [playerId]: value }));
  };

  /** Ronde vastleggen en door naar een nieuwe. */
  const commit = (values: Record<string, string>) => {
    const next =
      editingIndex === null
        ? [...rounds, values]
        : rounds.map((round, i) => (i === editingIndex ? values : round));
    onRoundsChange(next);
    setDraft({});
    setEditingIndex(null);
  };

  /** Registreer een rondewinnaar: 1 voor die speler, 0 voor de rest. */
  const pickRoundWinner = (playerId: string) => {
    commit(Object.fromEntries(playerIds.map((id) => [id, id === playerId ? "1" : "0"])));
  };

  const commitRound = () => {
    if (!playerIds.some((id) => (draft[id] ?? "").trim() !== "")) return;
    commit(draft);
  };

  const editRound = (index: number) => {
    setDraft(rounds[index] ?? {});
    setEditingIndex(index);
    setPhase("spelen");
  };

  const removeRound = (index: number) => {
    // Filteren hernummert vanzelf: rounds[i] ís ronde i+1.
    onRoundsChange(rounds.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setDraft({});
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const canFinish = rounds.length > 0;

  const heading = () => {
    if (config.format === "vast" && config.count)
      return `Ronde ${currentNumber} van ${config.count}`;
    if (config.format === "grens" && config.target)
      return `Ronde ${currentNumber} · tot ${config.target}`;
    if (isWinnerFormat) return `Ronde ${currentNumber} — wie won?`;
    return `Ronde ${currentNumber}`;
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">
        {phase === "spelen" ? heading() : "Klopt de eindstand? 🎯"}
      </h2>
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--muted-foreground)" }}>
        {phase === "spelen"
          ? isWinnerFormat
            ? "Tik wie deze ronde won."
            : "Vul de punten van deze ronde in — het totaal telt vanzelf op."
          : "De winnaar volgt uit de totalen."}
      </p>

      {/* Tussenstand — altijd zichtbaar, ook tijdens het afronden */}
      <div
        className="flex flex-wrap gap-2 mb-4 p-3 rounded-2xl"
        style={{ backgroundColor: "var(--color-warm-gray)" }}
      >
        {players.map((player) => {
          const total = totalById.get(player.id) ?? null;
          const leads = leaderId === player.id;
          return (
            <div key={player.id} className="flex items-center gap-1.5 text-sm font-bold">
              <span>{player.emoji}</span>
              <span style={{ color: leads ? "var(--color-coral)" : "var(--foreground)" }}>
                {total ?? 0}
                {config.format === "grens" && config.target ? `/${config.target}` : ""}
              </span>
              {overTarget.includes(player.id) && <span aria-label="over de grens">❗</span>}
            </div>
          );
        })}
      </div>

      {phase === "spelen" && (
        <>
          {isWinnerFormat ? (
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => pickRoundWinner(player.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-left cursor-pointer transition-all",
                    "border-[var(--border)] bg-[var(--card)] hover:border-[var(--color-coral)]"
                  )}
                >
                  <span className="text-2xl">{player.emoji}</span>
                  <span className="text-base">{player.name} won</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors"
                    style={{
                      borderColor: draft[player.id]?.trim()
                        ? "var(--color-coral)"
                        : "var(--border)",
                      backgroundColor: "var(--card)",
                    }}
                  >
                    <span className="text-2xl">{player.emoji}</span>
                    <span className="flex-1 font-bold text-sm">{player.name}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      aria-label={`Punten ${player.name} ronde ${currentNumber}`}
                      value={draft[player.id] ?? ""}
                      onChange={(e) => setValue(player.id, e.target.value)}
                      className="w-20 text-center py-1.5 px-2 rounded-xl border-2 font-bold text-sm outline-none transition-colors"
                      style={{
                        borderColor: draft[player.id]?.trim()
                          ? "var(--color-coral)"
                          : "var(--border)",
                        backgroundColor: "var(--muted)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={commitRound}
                className="w-full mt-3 py-2.5 rounded-2xl border-2 font-bold text-sm cursor-pointer hover:border-[var(--color-coral)] hover:text-[var(--color-coral)] transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                {editingIndex === null ? "Ronde opslaan →" : "Wijziging opslaan →"}
              </button>
            </>
          )}
        </>
      )}

      {/* Gespeelde rondes — hier corrigeer je een eerdere ronde */}
      {rounds.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Gespeelde rondes
          </p>
          {rounds.map((round, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor:
                  index === editingIndex
                    ? "color-mix(in srgb, var(--color-coral) 10%, var(--card))"
                    : "var(--card)",
              }}
            >
              <button
                type="button"
                onClick={() => editRound(index)}
                className="flex-1 flex items-center gap-2 text-left cursor-pointer"
                aria-label={`Ronde ${index + 1} aanpassen`}
              >
                <span style={{ color: "var(--muted-foreground)" }}>{index + 1}.</span>
                {players.map((player) => (
                  <span key={player.id} className="flex items-center gap-0.5">
                    {player.emoji}
                    {isWinnerFormat
                      ? round[player.id] === "1"
                        ? "🏆"
                        : "–"
                      : (round[player.id] ?? "–")}
                  </span>
                ))}
              </button>
              <button
                type="button"
                onClick={() => removeRound(index)}
                className="cursor-pointer opacity-60 hover:opacity-100"
                aria-label={`Ronde ${index + 1} verwijderen`}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {phase === "spelen" && (
        <div className="mt-5 space-y-2">
          {complete && (
            <p className="text-sm font-bold" style={{ color: "var(--color-coral)" }}>
              {config.format === "grens"
                ? `🎯 De grens van ${config.target} is gehaald — potje afgelopen`
                : "🎯 Alle rondes gespeeld — potje afgelopen"}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPhase("afronden")}
            disabled={!canFinish}
            className="w-full py-3 rounded-2xl font-bold text-sm cursor-pointer transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--color-coral)", color: "white" }}
          >
            Klaar 🎉
          </button>
          {complete && (
            // Sommige groepen spelen de ronde nog uit nadat de grens gehaald is.
            // Zonder deze uitweg zou het scherm daarop vastlopen.
            <button
              type="button"
              onClick={() => {
                setDraft({});
                setEditingIndex(null);
              }}
              className="w-full py-2 rounded-2xl border-2 font-bold text-xs cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              Toch nog een ronde
            </button>
          )}

          {/* Rondes bijhouden is nooit verplicht: soms staat de stand al op papier. */}
          <button
            type="button"
            onClick={onSkipRounds}
            className="w-full py-2 font-bold text-xs cursor-pointer underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            Alleen het eindtotaal invullen
          </button>
        </div>
      )}

      {phase === "afronden" && (
        <>
          <SessionExtras
            duration={duration}
            onDurationChange={onDurationChange}
            note={note}
            onNoteChange={onNoteChange}
          />
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full py-3 rounded-2xl font-bold text-sm cursor-pointer transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--color-coral)", color: "white" }}
            >
              {saving ? "Opslaan..." : "Opslaan 🎉"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("spelen")}
              className="w-full py-2 rounded-2xl border-2 font-bold text-xs cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              ← Terug naar de rondes
            </button>
          </div>
        </>
      )}
    </div>
  );
}
