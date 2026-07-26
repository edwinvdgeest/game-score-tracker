import Link from "next/link";
import type { Player } from "@/lib/schemas";
import type { DuelGameRecord } from "@/lib/duel";

interface PerGameRecordProps {
  records: DuelGameRecord[];
  playerA: Player;
  playerB: Player;
}

export function PerGameRecord({ records, playerA, playerB }: PerGameRecordProps) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-extrabold">⚔️ Wie is de baas?</h2>
      <div className="space-y-2">
        {records.map((record) => {
          const aShare = record.total > 0 ? (record.aWins / record.total) * 100 : 0;
          const bShare = record.total > 0 ? (record.bWins / record.total) * 100 : 0;
          const boss =
            record.aWins > record.bWins
              ? playerA
              : record.bWins > record.aWins
                ? playerB
                : null;

          return (
            <div
              key={record.game.id}
              className="p-3 rounded-2xl border space-y-2"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{record.game.emoji}</span>
                <Link
                  href={`/games/${record.game.id}`}
                  className="font-extrabold text-sm truncate flex-1 hover:underline"
                >
                  {record.game.name}
                </Link>
                <span className="font-black text-sm tabular-nums">
                  {record.aWins}–{record.bWins}
                </span>
              </div>

              {/* Split-balk: aandeel onderlinge winsten per speler */}
              <div
                className="flex h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--muted)" }}
                role="img"
                aria-label={`${playerA.name} ${record.aWins}, ${playerB.name} ${record.bWins}`}
              >
                <div style={{ width: `${aShare}%`, backgroundColor: "var(--color-coral)" }} />
                <div style={{ width: `${bShare}%`, backgroundColor: "var(--color-mint)" }} />
              </div>

              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {boss ? `${boss.emoji} ${boss.name} is hier de baas` : "Kop-aan-kop"}
                {record.draws > 0 &&
                  ` · ${record.draws === 1 ? "1 remise" : `${record.draws} remises`}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
