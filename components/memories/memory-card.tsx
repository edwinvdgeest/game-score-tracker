import Link from "next/link";
import type { Memory } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

interface MemoryCardProps {
  memory: Memory;
}

function yearsAgoLabel(yearsAgo: number): string {
  if (yearsAgo === 1) return "Een jaar geleden";
  return `${yearsAgo} jaar geleden`;
}

export function MemoryCard({ memory }: MemoryCardProps) {
  const { yearsAgo, sessions } = memory;

  return (
    <div
      className="rounded-3xl p-4 space-y-3"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--color-lavender) 14%, var(--card))",
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xl">🕰️</span>
        <h2 className="font-extrabold text-base">
          {yearsAgoLabel(yearsAgo)} speelden jullie…
        </h2>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const scored = session.scores.filter((entry) => entry.score !== null);

          return (
            <div key={session.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{session.game.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm truncate">
                    {session.game.name}
                  </div>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {formatDate(session.played_at)}
                    {session.winner
                      ? ` · ${session.winner.emoji} ${session.winner.name} won`
                      : " · 🤝 gelijkspel"}
                  </div>
                </div>
                <Link
                  href={`/?game=${session.game.id}`}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-colors hover:border-[var(--color-coral)] hover:text-[var(--color-coral)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  🎮 Nog eens?
                </Link>
              </div>

              {scored.length > 0 && (
                <div
                  className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold pl-9"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {scored.map((entry) => (
                    <span key={entry.player.id}>
                      {entry.player.emoji} {entry.score}
                    </span>
                  ))}
                </div>
              )}

              {session.notes && (
                <p
                  className="text-xs font-semibold italic pl-9"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  📝 {session.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
