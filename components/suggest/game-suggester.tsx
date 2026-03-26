"use client";

import { useState, useCallback } from "react";
import type { Game } from "@/lib/schemas";

interface GameSuggesterProps {
  initialCandidates: Game[];
}

export function GameSuggester({ initialCandidates }: GameSuggesterProps) {
  const [spinning, setSpinning] = useState(false);
  const [candidates, setCandidates] = useState<Game[]>(initialCandidates);
  const [result, setResult] = useState<Game | null>(null);
  const [displayGame, setDisplayGame] = useState<Game | null>(null);
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const spin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setPhase("spinning");
    setResult(null);

    // Ophalen nieuwe kandidaten (met optionele spelerfilter)
    let pool = candidates;
    try {
      const url = playerCount ? `/api/suggest?players=${playerCount}` : "/api/suggest";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Game[];
        if (Array.isArray(data) && data.length > 0) {
          pool = data;
          setCandidates(data);
        }
      }
    } catch {
      // gebruik bestaande pool
    }

    if (pool.length === 0) {
      setSpinning(false);
      setPhase("idle");
      return;
    }

    // Roulette-animatie: snel wisselen tussen kandidaten
    let count = 0;
    const totalTicks = 24;
    const interval = setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
      if (random) setDisplayGame(random);
      count++;

      if (count >= totalTicks) {
        clearInterval(interval);
        // Kies winner
        const winner = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
        if (winner) {
          setDisplayGame(winner);
          setResult(winner);
        }
        setPhase("done");
        setSpinning(false);
      }
    }, 80 + Math.min(count * 6, 120)); // vertraagt naarmate het eindigt
  }, [spinning, candidates, playerCount]);

  return (
    <div className="space-y-6">
      {/* Kaart display */}
      <div
        className="rounded-3xl p-8 text-center min-h-[200px] flex flex-col items-center justify-center transition-all"
        style={{
          backgroundColor:
            phase === "done"
              ? "var(--color-warm-yellow)"
              : "var(--color-warm-gray)",
          border: phase === "done" ? "3px solid var(--color-coral)" : "3px solid transparent",
        }}
      >
        {phase === "idle" && (
          <div className="space-y-2">
            <div className="text-5xl">🎲</div>
            <p className="font-extrabold text-lg" style={{ color: "var(--muted-foreground)" }}>
              Druk op de knop!
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
              We kiezen een spel dat jullie een tijdje niet gespeeld hebben
            </p>
          </div>
        )}

        {(phase === "spinning" || phase === "done") && displayGame && (
          <div
            className="space-y-2 transition-all"
            style={{
              transform: phase === "spinning" ? "scale(0.95)" : "scale(1)",
            }}
          >
            <div
              className="text-6xl transition-all"
              style={{
                filter: phase === "spinning" ? "blur(1px)" : "none",
                transition: "filter 0.3s",
              }}
            >
              {displayGame.emoji}
            </div>
            <div
              className="font-black text-2xl transition-all"
              style={{
                filter: phase === "spinning" ? "blur(1px)" : "none",
                transition: "filter 0.3s",
                color: "var(--foreground)",
              }}
            >
              {displayGame.name}
            </div>
            {phase === "done" && (
              <div className="space-y-1 mt-2 animate-bounce-once">
                <div className="font-extrabold text-sm" style={{ color: "var(--color-coral)" }}>
                  🏆 Jullie spelen dit vanavond!
                </div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {displayGame.category}
                  {displayGame.min_players && displayGame.max_players && (
                    <> · 👥 {displayGame.min_players}–{displayGame.max_players}</>
                  )}
                  {displayGame.difficulty && (
                    <> · {"⭐".repeat(displayGame.difficulty)}</>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spelers filter */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-center" style={{ color: "var(--muted-foreground)" }}>
          👥 Hoeveel spelers?
        </p>
        <div className="flex justify-center gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(playerCount === n ? null : n)}
              className="w-10 h-10 rounded-xl border-2 font-extrabold text-sm transition-all cursor-pointer"
              style={{
                borderColor: playerCount === n ? "var(--color-coral)" : "var(--border)",
                backgroundColor:
                  playerCount === n
                    ? "color-mix(in srgb, var(--color-coral) 12%, var(--card))"
                    : "var(--card)",
                color: playerCount === n ? "var(--color-coral)" : "var(--muted-foreground)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        {playerCount && (
          <p className="text-xs font-semibold text-center" style={{ color: "var(--muted-foreground)" }}>
            Alleen spellen voor {playerCount} spelers
          </p>
        )}
      </div>

      {/* Spin knop */}
      <button
        onClick={() => void spin()}
        disabled={spinning}
        className="w-full py-5 rounded-3xl text-white font-black text-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        style={{
          backgroundColor: "var(--color-coral)",
          boxShadow: "0 4px 0 #e05555",
        }}
      >
        {spinning ? "🎲 Draaien..." : result ? "🔄 Opnieuw" : "🎲 Wat zullen we spelen?"}
      </button>

      {/* Kandidaten */}
      {candidates.length > 0 && phase !== "spinning" && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-center" style={{ color: "var(--muted-foreground)" }}>
            Top {candidates.length} kandidaten (lang niet gespeeld)
            {playerCount && ` · ${playerCount} spelers`}
          </p>
          <div className="grid grid-cols-1 gap-1">
            {candidates.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-2 p-2 rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor:
                    result?.id === g.id ? "var(--color-warm-yellow)" : "var(--color-warm-gray)",
                  color:
                    result?.id === g.id ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                <span className="font-bold w-4 text-center">{i + 1}.</span>
                <span>{g.emoji}</span>
                <span className="flex-1">{g.name}</span>
                {g.difficulty && (
                  <span className="text-xs">{"⭐".repeat(g.difficulty)}</span>
                )}
                {result?.id === g.id && <span className="ml-auto">← gekozen! 🎉</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
