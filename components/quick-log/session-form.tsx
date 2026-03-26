"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { mutate } from "swr";
import type { Game, Player } from "@/lib/schemas";
import { GameGrid } from "./game-grid";
import { StarterPicker } from "./starter-picker";
import { ScoreEntry } from "./score-entry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";

// Dynamically load confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface SessionFormProps {
  games: Game[];
  players: Player[];
}

type Step = "game" | "starter" | "scores" | "done";

const PROGRESS_STEP: Record<Exclude<Step, "done">, number> = {
  game: 0,
  starter: 1,
  scores: 2,
};

/** Trigg haptic feedback als de browser het ondersteunt */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

/** Returns the winning player (highest score), or null on tie / no scores entered */
function computeWinner(
  players: Player[],
  scores: Record<string, string>
): Player | null {
  const parsed = players
    .map((p) => ({ player: p, score: parseInt(scores[p.id] ?? "", 10) }))
    .filter((s) => !isNaN(s.score));
  if (parsed.length === 0) return null;
  const max = Math.max(...parsed.map((s) => s.score));
  const tops = parsed.filter((s) => s.score === max);
  const solo = tops[0];
  return tops.length === 1 && solo ? solo.player : null;
}

export function SessionForm({ games, players }: SessionFormProps) {
  const [step, setStep] = useState<Step>("game");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedStarter, setSelectedStarter] = useState<Player | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);
  // undefined = not yet saved; null = saved with tie; Player = saved with winner
  const [winner, setWinner] = useState<Player | null | undefined>(undefined);
  // Swipe state
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { marathon } = useActiveMarathon();

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
    setStep("starter");
  }, []);

  const handleStarterSelect = useCallback((player: Player) => {
    setSelectedStarter(player);
    setStep("scores");
  }, []);

  const handleStarterSkip = useCallback(() => {
    setSelectedStarter(null);
    setStep("scores");
  }, []);

  const resetForm = useCallback(() => {
    setStep("game");
    setSelectedGame(null);
    setSelectedStarter(null);
    setScores({});
    setWinner(undefined);
  }, []);

  const handleSave = useCallback(
    async (scoreValues: Record<string, string>) => {
      if (!selectedGame) return;
      setSaving(true);

      const computedWinner = computeWinner(activePlayers, scoreValues);
      setWinner(computedWinner);

      const scoresArray = activePlayers.map((p) => ({
        player_id: p.id,
        score: scoreValues[p.id]?.trim()
          ? parseInt(scoreValues[p.id] ?? "", 10)
          : null,
      }));

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            winner_id: computedWinner?.id ?? null,
            starter_id: selectedStarter?.id ?? null,
            scores: scoresArray,
            marathon_id: marathon?.id ?? null,
          }),
        });

        if (!response.ok) throw new Error("Opslaan mislukt");

        const json = (await response.json()) as { queued?: boolean };
        if (json.queued) {
          toast.info("📵 Offline opgeslagen — wordt gesynchroniseerd zodra je online bent.");
        } else {
          // Invalidate SWR caches so dashboard/history update instantly
          void mutate((key) => typeof key === "string" && key.startsWith("/api/stats"));
          void mutate("/api/sessions");
          // Refresh marathon detail cache
          if (marathon?.id) {
            void mutate(`/api/marathon/${marathon.id}`);
          }
        }

        // Haptic: kort patroon bij opslaan, langer bij confetti-moment
        vibrate([50]);
        setTimeout(() => vibrate([100, 50, 100]), 200);

        setShowConfetti(true);
        setStep("done");

        // Als geen marathon actief: auto-reset na 3.5s
        if (!marathon) {
          setTimeout(() => {
            setShowConfetti(false);
            resetForm();
          }, 3500);
        }
      } catch {
        toast.error("Oeps! Er ging iets mis. Probeer opnieuw.");
        setWinner(undefined);
      } finally {
        setSaving(false);
      }
    },
    [selectedGame, selectedStarter, activePlayers, marathon, resetForm]
  );

  const handleScoreChange = useCallback((playerId: string, value: string) => {
    setScores((prev) => ({ ...prev, [playerId]: value }));
  }, []);

  const handleBack = useCallback(() => {
    if (step === "starter") {
      setStep("game");
      setSelectedGame(null);
    } else if (step === "scores") {
      setStep("starter");
      setSelectedStarter(null);
    }
  }, [step]);

  // Swipe-to-navigate: swipe left = vooruit (als mogelijk), swipe right = terug
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      touchStartX.current = null;
      const MIN_SWIPE = 60;
      if (Math.abs(dx) < MIN_SWIPE) return;

      if (dx < 0) {
        // Swipe left = vooruit — alleen als een game geselecteerd is
        if (step === "game" && selectedGame) {
          setSlideDir("left");
          setTimeout(() => { setSlideDir(null); setStep("starter"); }, 200);
        } else if (step === "starter") {
          setSlideDir("left");
          setTimeout(() => { setSlideDir(null); setStep("scores"); }, 200);
        }
      } else {
        // Swipe right = terug
        if (step === "starter" || step === "scores") {
          setSlideDir("right");
          setTimeout(() => { setSlideDir(null); handleBack(); }, 200);
        }
      }
    },
    [step, selectedGame, handleBack]
  );

  if (step === "done" && selectedGame) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        {showConfetti && (
          <ReactConfetti
            recycle={false}
            numberOfPieces={300}
            colors={["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE"]}
          />
        )}
        {winner ? (
          <>
            <div className="text-6xl" style={{ animation: "bounce 1s infinite" }}>
              {winner.emoji}
            </div>
            <h2 className="text-2xl font-black mb-2">🏆 {winner.name} wint!</h2>
          </>
        ) : (
          <>
            <div className="text-6xl" style={{ animation: "bounce 1s infinite" }}>
              🤝
            </div>
            <h2 className="text-2xl font-black mb-2">Gelijkspel!</h2>
          </>
        )}
        <p style={{ color: "var(--muted-foreground)" }} className="font-semibold">
          {selectedGame.emoji} {selectedGame.name}
        </p>

        {/* Marathon-knoppen: Volgende spel of terug naar scorebord */}
        {marathon && (
          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => {
                setShowConfetti(false);
                resetForm();
              }}
              className="w-full py-3.5 rounded-2xl font-black text-white text-base"
              style={{ backgroundColor: "var(--color-coral)" }}
            >
              🎮 Volgende spel
            </button>
            <Link
              href="/marathon"
              className="flex items-center justify-center w-full py-3 rounded-2xl font-bold border-2 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              🏁 Naar scorebord
            </Link>
          </div>
        )}
      </div>
    );
  }

  const progressStep = step !== "done" ? PROGRESS_STEP[step] : 3;

  return (
    <div
      className="space-y-6 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: slideDir === "left" ? "translateX(-8px)" : slideDir === "right" ? "translateX(8px)" : "translateX(0)",
        opacity: slideDir ? 0.7 : 1,
        transition: "transform 0.2s ease, opacity 0.2s ease",
      }}
    >
      {/* Marathon indicator */}
      {marathon && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-coral) 12%, var(--card))",
            color: "var(--color-coral)",
          }}
        >
          🏁 <span>Marathon actief: {marathon.name}</span>
        </div>
      )}

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
                        : "border-[var(--border)] opacity-50"
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

          <Link
            href="/suggest"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-extrabold text-sm transition-colors hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            🎲 Wat zullen we spelen?
          </Link>
        </>
      )}

      {step === "starter" && (
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
          <StarterPicker
            players={activePlayers}
            onSelect={handleStarterSelect}
            onSkip={handleStarterSkip}
          />
        </>
      )}

      {step === "scores" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="font-bold text-sm cursor-pointer"
              style={{ color: "var(--muted-foreground)" }}
            >
              ←{" "}
              {selectedStarter
                ? `${selectedStarter.emoji} ${selectedStarter.name} begon`
                : "Wie begon?"}
            </button>
          </div>
          <ScoreEntry
            players={activePlayers}
            scores={scores}
            onChange={handleScoreChange}
            onSave={() => void handleSave(scores)}
            saving={saving}
          />
        </>
      )}
    </div>
  );
}
