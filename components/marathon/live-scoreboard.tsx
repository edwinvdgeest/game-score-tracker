"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMarathonDetail } from "@/lib/hooks/useMarathon";
import { finishMarathon } from "@/lib/hooks/useMarathon";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/schemas";

const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

function Timer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  // Tick every minute
  if (typeof window !== "undefined") {
    setTimeout(() => setNow(Date.now()), 60_000);
  }
  const minutes = Math.floor((now - new Date(startedAt).getTime()) / 60_000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return <span>{hours}u {mins}m bezig</span>;
  return <span>{mins}m bezig</span>;
}

interface Props {
  marathonId: string;
}

export function LiveScoreboard({ marathonId }: Props) {
  const { detail, isLoading, mutate } = useMarathonDetail(marathonId);
  const [ending, setEnding] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const router = useRouter();

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-4xl">
        🏁
      </div>
    );
  }

  const { marathon, sessions, players, winCounts, mostPlayedGame, longestStreak } = detail;

  // Sort players by wins descending
  const ranked = [...players].sort((a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0));

  async function handleEnd() {
    setEnding(true);
    try {
      await finishMarathon(marathonId);
      await mutate();
      setShowEnd(true);
    } catch {
      toast.error("Kon de marathon niet beëindigen. Probeer opnieuw.");
      setEnding(false);
    }
  }

  if (showEnd) {
    return <EndScreen players={players} winCounts={winCounts} sessions={sessions} mostPlayedGame={mostPlayedGame} longestStreak={longestStreak} marathonName={marathon.name ?? "Spellenavond"} />;
  }

  const podiumEmojis = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="text-4xl">🏁</div>
        <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
          {marathon.name ?? "Spellenavond"}
        </h1>
        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
          <Timer startedAt={marathon.started_at} />
          {" · "}
          {sessions.length} {sessions.length === 1 ? "potje" : "potjes"} gespeeld
        </p>
      </div>

      {/* Op tablet: scorebord + gespeelde potjes naast elkaar */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
        {/* Scorebord — groot en leesbaar */}
        <div className="space-y-3">
          {ranked.map((player, i) => {
            const wins = winCounts[player.id] ?? 0;
            const losses = sessions.filter(s => s.winner_id !== null && s.winner_id !== player.id).length;
            const isLeader = i === 0 && wins > 0;
            return (
              <div
                key={player.id}
                className="flex items-center gap-4 rounded-3xl px-5 py-4 transition-transform"
                style={{
                  backgroundColor: isLeader ? "color-mix(in srgb, var(--color-coral) 15%, var(--card))" : "var(--card)",
                  border: isLeader ? "2px solid var(--color-coral)" : "2px solid var(--border)",
                }}
              >
                <span className="text-3xl">{podiumEmojis[i] ?? "🎮"}</span>
                <span className="text-4xl">{player.emoji}</span>
                <div className="flex-1">
                  <div className="text-xl font-black" style={{ color: "var(--foreground)" }}>
                    {player.name}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    {losses} {losses === 1 ? "verlies" : "verlies"} · {sessions.length - wins - losses} gelijk
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black" style={{ color: isLeader ? "var(--color-coral)" : "var(--foreground)" }}>
                    {wins}
                  </div>
                  <div className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                    {wins === 1 ? "win" : "wins"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gespeelde potjes */}
        {sessions.length > 0 && (
          <div className="space-y-2 mt-6 md:mt-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Gespeelde potjes
            </p>
            <div className="space-y-1.5">
              {[...sessions].reverse().map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                  style={{ backgroundColor: "var(--card)" }}
                >
                  <span className="text-xs font-bold w-5 text-right" style={{ color: "var(--muted-foreground)" }}>
                    {sessions.length - i}
                  </span>
                  <span className="text-lg">{s.game?.emoji ?? "🎮"}</span>
                  <span className="flex-1 text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    {s.game?.name ?? "Onbekend spel"}
                  </span>
                  {s.winner ? (
                    <span className="text-sm font-extrabold" style={{ color: "var(--color-coral)" }}>
                      {s.winner.emoji} {s.winner.name}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      🤝 Gelijk
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acties */}
      <div className="space-y-3 md:flex md:gap-3 md:space-y-0">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          🎮 Volgende spel
        </Link>

        <Button
          variant="outline"
          className="w-full rounded-2xl font-bold"
          onClick={() => void handleEnd()}
          disabled={ending}
        >
          {ending ? "Afsluiten…" : "🏆 Eindstand bekijken"}
        </Button>
      </div>
    </div>
  );
}

// ─── Eindstand scherm ────────────────────────────────────────────────────────

interface EndScreenProps {
  players: Player[];
  winCounts: Record<string, number>;
  sessions: Array<{ winner_id: string | null; game?: { name: string; emoji: string } | null }>;
  mostPlayedGame: { name: string; emoji: string; count: number } | null;
  longestStreak: { player: Player; streak: number } | null;
  marathonName: string;
}

function EndScreen({ players, winCounts, sessions, mostPlayedGame, longestStreak, marathonName }: EndScreenProps) {
  const router = useRouter();
  const ranked = [...players].sort((a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0));
  const [first, second, third] = ranked;

  const podiumEmojis = ["🥇", "🥈", "🥉"];
  const podiumSizes = ["text-6xl", "text-5xl", "text-4xl"];

  return (
    <div className="space-y-6 pb-6 text-center">
      <ReactConfetti
        recycle={false}
        numberOfPieces={400}
        colors={["#FF6B6B", "#FFE66D", "#4ECDC4", "#A29BFE", "#FD9644"]}
      />

      <div className="space-y-1">
        <div className="text-5xl">🏆</div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Eindstand!
        </h1>
        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
          {marathonName}
        </p>
      </div>

      {/* Podium */}
      <div className="space-y-4">
        {ranked.slice(0, 3).map((player, i) => {
          const wins = winCounts[player.id] ?? 0;
          return (
            <div
              key={player.id}
              className="flex items-center gap-4 rounded-3xl px-5 py-4"
              style={{
                backgroundColor: i === 0 ? "color-mix(in srgb, var(--color-warm-yellow) 20%, var(--card))" : "var(--card)",
                border: i === 0 ? "2px solid var(--color-warm-yellow)" : "2px solid var(--border)",
              }}
            >
              <span className={podiumSizes[i]}>{podiumEmojis[i]}</span>
              <span className={podiumSizes[i]}>{player.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-xl font-black" style={{ color: "var(--foreground)" }}>
                  {player.name}
                  {i === 0 && <span className="ml-2 text-sm">🎉</span>}
                </div>
              </div>
              <div className="text-4xl font-black" style={{ color: i === 0 ? "var(--color-warm-yellow)" : "var(--foreground)" }}>
                {wins}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div
        className="rounded-3xl p-4 space-y-3 text-left"
        style={{ backgroundColor: "var(--card)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Fun stats
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: "var(--muted-foreground)" }}>Totaal potjes</span>
            <span style={{ color: "var(--foreground)" }}>{sessions.length}</span>
          </div>
          {mostPlayedGame && (
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: "var(--muted-foreground)" }}>Meest gespeeld</span>
              <span style={{ color: "var(--foreground)" }}>{mostPlayedGame.emoji} {mostPlayedGame.name} ({mostPlayedGame.count}×)</span>
            </div>
          )}
          {longestStreak && longestStreak.streak >= 2 && (
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: "var(--muted-foreground)" }}>Langste winstreak</span>
              <span style={{ color: "var(--foreground)" }}>{longestStreak.player.emoji} {longestStreak.player.name} ({longestStreak.streak}×)</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-2xl font-black text-white text-lg"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          🎮 Nog een avond?
        </button>
        <button
          onClick={() => router.push("/marathon/history")}
          className="w-full py-3 rounded-2xl font-bold border-2"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          📜 Marathon-historie
        </button>
      </div>
    </div>
  );
}
