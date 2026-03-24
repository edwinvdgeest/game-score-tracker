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
        <div
          key={game.id}
          className="flex items-center gap-3 p-3 bg-white rounded-2xl border"
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
        </div>
      ))}
    </div>
  );
}
