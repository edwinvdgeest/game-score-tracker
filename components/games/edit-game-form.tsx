"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Game, GameCategory } from "@/lib/schemas";

const categories: Array<{ value: GameCategory; label: string }> = [
  { value: "bordspel", label: "🏠 Bordspel" },
  { value: "kaartspel", label: "🃏 Kaartspel" },
  { value: "dobbelspel", label: "🎲 Dobbelspel" },
  { value: "woordspel", label: "🔤 Woordspel" },
  { value: "overig", label: "🎯 Overig" },
];

const difficultyLabel: Record<number, string> = {
  1: "Heel makkelijk",
  2: "Makkelijk",
  3: "Gemiddeld",
  4: "Moeilijk",
  5: "Heel moeilijk",
};

interface EditGameFormProps {
  game: Game;
  onClose: () => void;
}

export function EditGameForm({ game, onClose }: EditGameFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(game.name);
  const [emoji, setEmoji] = useState(game.emoji);
  const [category, setCategory] = useState<GameCategory>(game.category);
  const [difficulty, setDifficulty] = useState<number | null>(game.difficulty ?? null);
  const [minPlayers, setMinPlayers] = useState<string>(String(game.min_players ?? 2));
  const [maxPlayers, setMaxPlayers] = useState<string>(String(game.max_players ?? 4));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji,
          category,
          difficulty: difficulty ?? null,
          min_players: parseInt(minPlayers, 10) || 2,
          max_players: parseInt(maxPlayers, 10) || 4,
        }),
      });

      if (!response.ok) throw new Error("Opslaan mislukt");

      toast.success(`${emoji} ${name} bijgewerkt! ✏️`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-[var(--card)] rounded-3xl border p-4 space-y-4"
    >
      <h3 className="font-extrabold text-lg">Spel bewerken ✏️</h3>

      <div className="space-y-1">
        <label htmlFor="edit-game-name" className="text-sm font-bold block">
          Naam
        </label>
        <input
          id="edit-game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-game-emoji" className="text-sm font-bold block">
          Emoji
        </label>
        <input
          id="edit-game-emoji"
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-2xl outline-none focus:border-[var(--color-coral)]"
          maxLength={4}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-game-category" className="text-sm font-bold block">
          Categorie
        </label>
        <select
          id="edit-game-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GameCategory)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)] bg-[var(--card)]"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Moeilijkheidsgraad */}
      <div className="space-y-1">
        <label className="text-sm font-bold block">Moeilijkheidsgraad</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setDifficulty(difficulty === star ? null : star)}
              className="text-2xl transition-transform hover:scale-110 cursor-pointer leading-none"
              aria-label={`${star} ster`}
            >
              {star <= (difficulty ?? 0) ? "⭐" : "☆"}
            </button>
          ))}
          {difficulty && (
            <span className="ml-2 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              {difficultyLabel[difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* Aantal spelers */}
      <div className="space-y-1">
        <label className="text-sm font-bold block">Aantal spelers</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="edit-min-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Min
            </label>
            <input
              id="edit-min-players"
              type="number"
              min={1}
              max={20}
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>–</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="edit-max-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Max
            </label>
            <input
              id="edit-max-players"
              type="number"
              min={1}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>spelers</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-[var(--muted)]"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 py-2 rounded-xl text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
