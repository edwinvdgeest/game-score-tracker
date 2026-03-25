"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Game, Player } from "@/lib/schemas";
import { GameGrid } from "./game-grid";
import { WinnerPicker } from "./winner-picker";
import { ScoreEntry } from "./score-entry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Dynamically load confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface SessionFormProps {
  games: Game[];
  players: Player[];
}

type Step = "game" | "winner" | "scores" | "done";

const PROGRESS_STEP: Record<Exclude<Step, "done">, number> = {
  game: 0,
  winner: 1,
  scores: 2,
};

export function SessionForm({ games, players }: SessionFormProps) {
  const [step, setStep] = useState<Step>("game");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Player | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default: everyone except Minou
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(
    () => new Set(players.filter((p) => p.name !== "Minou").map((p) => p.id))
  );

  const activePlayers = useMemo(
    () => players.filter((p) => activePlayerIds.has(p.id)),
    [players, activePlayerIds]
  );

  const togglePlayer = useCallback((playerId: string) => {
    setActivePlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        if (next.size <= 1) return prev; // keep at least 1 player
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setStep("winner");
  }, []);

  const handleWinnerSelect = useCallback((player: Player) => {
    setSelectedWinner(player);
    setStep("scores");
  }, []);

  const handleSave = useCallback(
    async (scoreValues: Record<string, string>) => {
      if (!selectedGame || !selectedWinner) return;
      setSaving(true);

      // Always include all active players; score is null if not entered
      const scoresArray = activePlayers.map((p) => ({
        player_id: p.id,
        score: scoreValues[p.id]?.trim()
          ? parseInt(scoreValues[p.id], 10)
          : null,
      }));

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            winner_id: selectedWinner.id,
            scores: scoresArray,
          }),
        });

        if (!response.ok) {
          throw new Error("Opslaan mislukt");
        }

        setShowConfetti(true);
        setStep("done");

        setTimeout(() => {
          setShowConfetti(false);
          setStep("game");
          setSelectedGame(null);
          setSelectedWinner(null);
          setScores({});
        }, 3500);
      } catch {
        toast.error("Oeps! Er ging iets mis. Probeer opnieuw.");
      } finally {
        setSaving(false);
      }
    },
    [selectedGame, selectedWinner, activePlayers]
  );

  const handleScoreChange = useCallback((playerId: string, value: string) => {
    setScores((prev) => ({ ...prev, [playerId]: value }));
  }, []);

  const handleBack = useCallback(() => {
    if (step === "winner") {
      setStep("game");
      setSelectedGame(null);
    } else if (step === "scores") {
      setStep("winner");
      setSelectedWinner(null);
    }
  }, [step]);

  if (step === "done" && selectedGame && selectedWinner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {showConfetti && (
          <ReactConfetti
            recycle={false}
            numberOfPieces={300}
            colors={["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE"]}
          />
        )}
        <div
          className="text-6xl mb-4"
          style={{ animation: "bounce 1s infinite" }}
        >
          {selectedWinner.emoji}
        </div>
        <h2 className="text-2xl font-black mb-2">
          {selectedWinner.name} wint! 🎉
        </h2>
        <p style={{ color: "var(--muted-foreground)" }} className="font-semibold">
          {selectedGame.emoji} {selectedGame.name}
        </p>
      </div>
    );
  }

  const progressStep = step !== "done" ? PROGRESS_STEP[step] : 3;

  return (
    <div className="space-y-6">
      {/* Progress indicator — 3 steps */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor:
                i <= progressStep ? "var(--color-coral)" : "var(--border)",
            }}
          />
        ))}
      </div>

      {step === "game" && (
        <>
          {/* Player selection */}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Wie spelen er mee?
            </p>
            <div className="flex gap-2 flex-wrap">
              {players.map((player) => {
                const active = activePlayerIds.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-bold text-sm transition-all cursor-pointer",
                      active
                        ? "border-[var(--color-coral)] bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)]"
                        : "border-[var(--border)] bg-white opacity-50"
                    )}
                  >
                    <span>{player.emoji}</span>
                    <span>{player.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <GameGrid
            games={games}
            selectedGameId={selectedGame?.id ?? null}
            onSelect={handleGameSelect}
          />
        </>
      )}

      {step === "winner" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="font-bold text-sm cursor-pointer"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← {selectedGame?.emoji} {selectedGame?.name}
            </button>
          </div>
          <WinnerPicker
            players={activePlayers}
            selectedWinnerId={selectedWinner?.id ?? null}
            onSelect={handleWinnerSelect}
          />
        </>
      )}

      {step === "scores" && selectedWinner && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="font-bold text-sm cursor-pointer"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← {selectedWinner.emoji} {selectedWinner.name}
            </button>
          </div>
          <ScoreEntry
            players={activePlayers}
            winnerId={selectedWinner.id}
            scores={scores}
            onChange={handleScoreChange}
            onSkip={() => void handleSave({})}
            onSave={() => void handleSave(scores)}
            saving={saving}
          />
        </>
      )}
    </div>
  );
}
