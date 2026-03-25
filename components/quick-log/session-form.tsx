"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Game, Player } from "@/lib/schemas";
import { GameGrid } from "./game-grid";
import { WinnerPicker } from "./winner-picker";
import { ScoreEntry } from "./score-entry";
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

      const scoresArray = players
        .map((p) => ({
          player_id: p.id,
          score:
            scoreValues[p.id]?.trim()
              ? parseInt(scoreValues[p.id], 10)
              : null,
        }))
        .filter(
          (s): s is { player_id: string; score: number } =>
            s.score !== null && !isNaN(s.score)
        );

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            winner_id: selectedWinner.id,
            scores: scoresArray.length > 0 ? scoresArray : undefined,
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
    [selectedGame, selectedWinner, players]
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

  const progressStep =
    step !== "done" ? PROGRESS_STEP[step] : 3;

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
        <GameGrid
          games={games}
          selectedGameId={selectedGame?.id ?? null}
          onSelect={handleGameSelect}
        />
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
            players={players}
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
            players={players}
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
