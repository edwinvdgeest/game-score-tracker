import type { SeasonStanding } from "@/lib/seasons";
import { POINTS_DRAW, POINTS_WIN } from "@/lib/seasons";

interface SeasonStandingsProps {
  standings: SeasonStanding[];
  champion: SeasonStanding | null;
  isCurrent: boolean;
}

const rankEmoji = ["🥇", "🥈", "🥉"] as const;

export function SeasonStandings({
  standings,
  champion,
  isCurrent,
}: SeasonStandingsProps) {
  const played = standings.filter((s) => s.played > 0);

  if (played.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-3xl font-semibold"
        style={{
          backgroundColor: "var(--color-warm-gray)",
          color: "var(--muted-foreground)",
        }}
      >
        In dit seizoen is nog niet gespeeld 🎲
      </div>
    );
  }

  const leader = standings[0];

  return (
    <div className="space-y-4">
      {/* Kampioen of leider */}
      {champion ? (
        <div
          className="rounded-3xl p-4 text-center"
          style={{ backgroundColor: "var(--color-warm-yellow)" }}
        >
          <div className="text-5xl mb-2">{champion.player.emoji}</div>
          <div className="text-xl font-black">
            {isCurrent
              ? `${champion.player.name} leidt!`
              : `${champion.player.name} is kampioen! 🏆`}
          </div>
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            {champion.points} punten · {champion.wins}{" "}
            {champion.wins === 1 ? "winst" : "winsten"}
          </div>
        </div>
      ) : (
        leader && (
          <div
            className="rounded-3xl p-4 text-center"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          >
            <div className="text-3xl mb-1">🤝</div>
            <div className="font-black">Kop-aan-kop op {leader.points} punten</div>
          </div>
        )
      )}

      <div className="space-y-2">
        {standings.map((standing, index) => (
          <div
            key={standing.player.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card)] border"
            style={{
              borderColor:
                index === 0 && standing.played > 0
                  ? "var(--color-warm-yellow)"
                  : "var(--border)",
            }}
          >
            <span className="text-2xl w-8 text-center">
              {standing.played > 0
                ? (rankEmoji[index] ?? String(index + 1))
                : "—"}
            </span>
            <span className="text-2xl">{standing.player.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold truncate">{standing.player.name}</div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {standing.wins}W · {standing.draws}G · {standing.losses}V
                {standing.played > 0 &&
                  ` · ${standing.played} ${standing.played === 1 ? "potje" : "potjes"}`}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-black text-lg tabular-nums"
                style={{ color: "var(--color-coral)" }}
              >
                {standing.points}
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {standing.points === 1 ? "punt" : "punten"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        className="text-xs font-semibold text-center"
        style={{ color: "var(--muted-foreground)" }}
      >
        Winst {POINTS_WIN} punten · gelijkspel {POINTS_DRAW} punt · verlies 0
      </p>
    </div>
  );
}
