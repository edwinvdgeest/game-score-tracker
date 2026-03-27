import type { ScoreHighlights } from "@/lib/schemas";
import { formatShortDate } from "@/lib/utils";

interface ScoreHighlightsProps {
  highlights: ScoreHighlights;
}

export function ScoreHighlightsSection({ highlights }: ScoreHighlightsProps) {
  const { highest_score, avg_scores, biggest_diff } = highlights;

  const hasAnyData =
    highest_score !== null ||
    avg_scores.length > 0 ||
    biggest_diff !== null;

  if (!hasAnyData) return null;

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-3">🎯 Score highlights</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Hoogste score */}
        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
            🏆 Hoogste score ooit
          </div>
          {highest_score ? (
            <div>
              <div className="text-3xl font-black" style={{ color: "var(--color-coral)" }}>
                {highest_score.score}
              </div>
              <div className="text-sm font-bold mt-1">
                {highest_score.player.emoji} {highest_score.player.name}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {highest_score.game.emoji} {highest_score.game.name}
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Nog geen scores
            </div>
          )}
        </div>

        {/* Gemiddelde per speler */}
        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
            📊 Gemiddeld per speler
          </div>
          {avg_scores.length > 0 ? (
            <div className="space-y-1.5">
              {avg_scores.map((entry) => (
                <div key={entry.player.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold truncate">
                    {entry.player.emoji} {entry.player.name}
                  </span>
                  <span
                    className="text-sm font-black shrink-0"
                    style={{ color: "var(--color-coral)" }}
                  >
                    {entry.avg}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Nog geen scores
            </div>
          )}
        </div>

        {/* Grootste verschil */}
        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
            ↔️ Grootste verschil
          </div>
          {biggest_diff ? (
            <div>
              <div className="text-3xl font-black" style={{ color: "var(--color-coral)" }}>
                {biggest_diff.diff}
              </div>
              <div className="text-sm font-bold mt-1">
                {biggest_diff.game.emoji} {biggest_diff.game.name}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {formatShortDate(biggest_diff.played_at)}
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Nog geen scores
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
