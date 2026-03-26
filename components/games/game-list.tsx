"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Star, Archive, ArchiveX, ChevronRight } from "lucide-react";
import type { GameWithStats } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type SortOption = "meest_gespeeld" | "laatst_gespeeld" | "alfabetisch";

const categoryLabel: Record<string, string> = {
  bordspel: "Bordspel",
  kaartspel: "Kaartspel",
  dobbelspel: "Dobbelspel",
  woordspel: "Woordspel",
  overig: "Overig",
};

const categoryOrder = ["bordspel", "kaartspel", "dobbelspel", "woordspel", "overig"];

interface GameListProps {
  games: GameWithStats[];
}

export function GameList({ games: initialGames }: GameListProps) {
  const [games, setGames] = useState(initialGames);
  const [sort, setSort] = useState<SortOption>("meest_gespeeld");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeGames = useMemo(() => games.filter((g) => !g.is_archived), [games]);
  const archivedGames = useMemo(() => games.filter((g) => g.is_archived), [games]);

  const sorted = useMemo(() => {
    const list = [...activeGames];
    list.sort((a, b) => {
      // Favorites always first
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;

      if (sort === "meest_gespeeld") return b.totalSessions - a.totalSessions;
      if (sort === "alfabetisch") return a.name.localeCompare(b.name, "nl");
      if (sort === "laatst_gespeeld") {
        if (a.lastPlayedAt && b.lastPlayedAt) return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
        if (a.lastPlayedAt) return -1;
        if (b.lastPlayedAt) return 1;
        return a.name.localeCompare(b.name, "nl");
      }
      return 0;
    });
    return list;
  }, [activeGames, sort]);

  const grouped = useMemo(() => {
    if (!groupByCategory) return null;
    const map = new Map<string, GameWithStats[]>();
    for (const cat of categoryOrder) map.set(cat, []);
    for (const game of sorted) {
      map.get(game.category)?.push(game);
    }
    return map;
  }, [sorted, groupByCategory]);

  async function toggleFavorite(game: GameWithStats, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newValue = !game.is_favorite;
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, is_favorite: newValue } : g))
    );
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: newValue }),
    });
  }

  async function toggleArchive(game: GameWithStats, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newValue = !game.is_archived;
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, is_archived: newValue } : g))
    );
  }

  function formatLastPlayed(dateStr: string | null): string {
    if (!dateStr) return "Nooit gespeeld";
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: nl });
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 font-semibold" style={{ color: "var(--muted-foreground)" }}>
        Nog geen spellen toegevoegd
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-2">
        {/* Sort */}
        <div className="flex gap-1 flex-wrap">
          {([
            ["meest_gespeeld", "Meest gespeeld"],
            ["laatst_gespeeld", "Laatst gespeeld"],
            ["alfabetisch", "A–Z"],
          ] as [SortOption, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                sort === value
                  ? "text-white"
                  : "bg-white border font-semibold hover:border-[var(--color-coral)]"
              )}
              style={sort === value ? { backgroundColor: "var(--color-coral)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Group toggle */}
        <button
          onClick={() => setGroupByCategory((v) => !v)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer",
            groupByCategory
              ? "text-white"
              : "bg-white border font-semibold hover:border-[var(--color-coral)]"
          )}
          style={groupByCategory ? { backgroundColor: "var(--color-mint, #4ecdc4)" } : {}}
        >
          {groupByCategory ? "✓ " : ""}Groepeer per categorie
        </button>
      </div>

      {/* Game list */}
      {grouped ? (
        <div className="space-y-5">
          {categoryOrder.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2
                  className="text-xs font-extrabold uppercase tracking-wider mb-2 px-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {categoryLabel[cat] ?? cat}
                </h2>
                <div className="space-y-2">
                  {items.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onFavorite={toggleFavorite}
                      onArchive={toggleArchive}
                      formatLastPlayed={formatLastPlayed}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onFavorite={toggleFavorite}
              onArchive={toggleArchive}
              formatLastPlayed={formatLastPlayed}
            />
          ))}
        </div>
      )}

      {/* Archived section */}
      {archivedGames.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-bold cursor-pointer hover:underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            {showArchived ? "▲ Verberg gearchiveerde spellen" : `▼ Toon gearchiveerde spellen (${archivedGames.length})`}
          </button>
          {showArchived && (
            <div className="space-y-2 mt-2 opacity-50">
              {archivedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onFavorite={toggleFavorite}
                  onArchive={toggleArchive}
                  formatLastPlayed={formatLastPlayed}
                  archived
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GameCardProps {
  game: GameWithStats;
  onFavorite: (game: GameWithStats, e: React.MouseEvent) => void;
  onArchive: (game: GameWithStats, e: React.MouseEvent) => void;
  formatLastPlayed: (dateStr: string | null) => string;
  archived?: boolean;
}

function GameCard({ game, onFavorite, onArchive, formatLastPlayed, archived }: GameCardProps) {
  return (
    <div className="relative group">
      <Link
        href={`/games/${game.id}`}
        className={cn(
          "flex items-center gap-3 p-3 bg-white rounded-2xl border transition-colors",
          "hover:border-[var(--color-coral)] active:scale-[0.98] pr-20"
        )}
      >
        <span className="text-2xl flex-shrink-0">{game.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm flex items-center gap-1.5">
            {game.name}
            {game.is_favorite && !archived && <span className="text-yellow-400 text-xs">⭐</span>}
          </div>
          <div
            className="text-xs font-semibold"
            style={{ color: "var(--muted-foreground)" }}
          >
            {categoryLabel[game.category] ?? game.category}
          </div>
          {/* Mini-stats */}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {game.totalSessions > 0 ? `${game.totalSessions}x gespeeld` : "Nog nooit gespeeld"}
            </span>
            {game.topWinner && (
              <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                👑 {game.topWinner.name} ({game.topWinner.winPercentage}%)
              </span>
            )}
            <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {formatLastPlayed(game.lastPlayedAt)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
      </Link>

      {/* Action buttons overlay */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {!archived && (
          <button
            onClick={(e) => onFavorite(game, e)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
              game.is_favorite
                ? "text-yellow-400 hover:text-yellow-500"
                : "text-gray-300 hover:text-yellow-400"
            )}
            title={game.is_favorite ? "Verwijder uit favorieten" : "Toevoegen aan favorieten"}
          >
            <Star className="w-4 h-4" fill={game.is_favorite ? "currentColor" : "none"} />
          </button>
        )}
        <button
          onClick={(e) => onArchive(game, e)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-gray-300 hover:text-gray-500"
          title={archived ? "Herstellen uit archief" : "Archiveren"}
        >
          {archived ? <ArchiveX className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
