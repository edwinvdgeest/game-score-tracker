"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Game, Player } from "@/lib/schemas";
import { GameGrid } from "./game-grid";
import { WinnerPicker } from "./winner-picker";
import { toast } from "sonner";

// Dynamically load confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface SessionFormProps {
  games: Game[];
  players: Player[];
}

type Step = "game" | "winner" | "done";

export function SessionForm({ games, players }: SessionFormProps) {
  const [step, setStep] = useState<Step>("game");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Player | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setStep("winner");
  }, []);

  const handleWinnerSelect = useCallback(
    async (player: Player) => {
      if (!selectedGame) return;
      setSelectedWinner(player);
      setSaving(true);

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            winner_id: player.id,
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
        }, 3500);
      } catch {
        toast.error("Oeps! Er ging iets mis. Probeer opnieuw.");
      } finally {
        setSaving(false);
      }
    },
    [selectedGame]
  );

  const handleBack = useCallback(() => {
    if (step === "winner") {
      setStep("game");
      setSelectedGame(null);
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

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-2">
        <div
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{
            backgroundColor:
              step === "game" || step === "winner"
                ? "var(--color-coral)"
                : "var(--border)",
          }}
        />
        <div
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{
            backgroundColor:
              step === "winner" ? "var(--color-coral)" : "var(--border)",
          }}
        />
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
            onSelect={(player) => void handleWinnerSelect(player)}
          />
          {saving && (
            <p
              className="text-center text-sm font-semibold animate-pulse"
              style={{ color: "var(--muted-foreground)" }}
            >
              Opslaan...
            </p>
          )}
        </>
      )}
    </div>
  );
}
