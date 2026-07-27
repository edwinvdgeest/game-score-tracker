import type { Player } from "@/lib/schemas";
import type { HeadToHead } from "@/lib/duel";

interface DuelScoreboardProps {
  playerA: Player;
  playerB: Player;
  stats: HeadToHead;
}

export function DuelScoreboard({ playerA, playerB, stats }: DuelScoreboardProps) {
  const { aWins, bWins, draws, total } = stats;
  const leader = aWins > bWins ? playerA : bWins > aWins ? playerB : null;

  return (
    <div
      className="rounded-3xl p-5 text-center space-y-3"
      style={{ backgroundColor: "var(--color-warm-yellow)" }}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-right">
          <div className="text-4xl">{playerA.emoji}</div>
          <div className="font-extrabold text-sm truncate">{playerA.name}</div>
        </div>
        <div className="font-black text-4xl tabular-nums whitespace-nowrap">
          {aWins}
          <span className="mx-1.5 text-2xl align-middle">–</span>
          {bWins}
        </div>
        <div className="flex-1 text-left">
          <div className="text-4xl">{playerB.emoji}</div>
          <div className="font-extrabold text-sm truncate">{playerB.name}</div>
        </div>
      </div>

      <div className="text-sm font-bold">
        {leader ? `${leader.emoji} ${leader.name} leidt!` : "Precies gelijk 🤝"}
      </div>

      <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
        {total === 1 ? "1 gedeeld potje" : `${total} gedeelde potjes`}
        {draws > 0 && ` · ${draws === 1 ? "1 remise" : `${draws} remises`}`}
        <div className="mt-0.5">op basis van score per potje</div>
      </div>
    </div>
  );
}
