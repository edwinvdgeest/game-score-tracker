import Link from "next/link";
import type { Game } from "@/lib/schemas";

const categoryLabel: Record<string, string> = {
  bordspel: "Bordspel",
  kaartspel: "Kaartspel",
  dobbelspel: "Dobbelspel",
  woordspel: "Woordspel",
  overig: "Overig",
};

interface GameListProps {
  games: Game[];
}

export function GameList({ games }: GameListProps) {
  if (games.length === 0) {
    return (
      <div
        className="text-center py-8 font-semibold"
        style={{ color: "var(--muted-foreground)" }}
      >
        Nog geen spellen toegevoegd
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game) => (
        <Link
          key={game.id}
          href={`/games/${game.id}`}
          className="flex items-center gap-3 p-3 bg-white rounded-2xl border transition-colors hover:border-[var(--color-coral)] active:scale-[0.98]"
        >
          <span className="text-2xl">{game.emoji}</span>
          <div className="flex-1">
            <div className="font-extrabold text-sm">{game.name}</div>
            <div
              className="text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              {categoryLabel[game.category] ?? game.category} ·{" "}
              {game.min_players}–{game.max_players} spelers
            </div>
          </div>
          <span style={{ color: "var(--muted-foreground)" }} className="text-sm">›</span>
        </Link>
      ))}
    </div>
  );
}
