"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GameCategory } from "@/lib/schemas";

const categories: Array<{ value: GameCategory; label: string }> = [
  { value: "bordspel", label: "🏠 Bordspel" },
  { value: "kaartspel", label: "🃏 Kaartspel" },
  { value: "dobbelspel", label: "🎲 Dobbelspel" },
  { value: "woordspel", label: "🔤 Woordspel" },
  { value: "overig", label: "🎯 Overig" },
];

const categoryDefaultEmoji: Record<GameCategory, string> = {
  bordspel: "🎲",
  kaartspel: "🃏",
  dobbelspel: "🎯",
  woordspel: "📝",
  overig: "🎮",
};

const difficultyLabel: Record<number, string> = {
  1: "Heel makkelijk",
  2: "Makkelijk",
  3: "Gemiddeld",
  4: "Moeilijk",
  5: "Heel moeilijk",
};

export function AddGameForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [emojiManuallySet, setEmojiManuallySet] = useState(false);
  const [category, setCategory] = useState<GameCategory>("bordspel");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [lowestScoreWins, setLowestScoreWins] = useState(false);
  const [minPlayers, setMinPlayers] = useState<string>("2");
  const [maxPlayers, setMaxPlayers] = useState<string>("4");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji,
          category,
          difficulty: difficulty ?? null,
          min_players: parseInt(minPlayers, 10) || 2,
          max_players: parseInt(maxPlayers, 10) || 4,
          lowest_score_wins: lowestScoreWins,
        }),
      });

      if (!response.ok) {
        throw new Error("Opslaan mislukt");
      }

      toast.success(`${emoji} ${name} toegevoegd! 🎉`);
      setName("");
      setEmoji("🎲");
      setEmojiManuallySet(false);
      setCategory("bordspel");
      setDifficulty(null);
      setLowestScoreWins(false);
      setMinPlayers("2");
      setMaxPlayers("4");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-2xl text-white font-extrabold text-base transition-opacity hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        + Spel toevoegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-[var(--card)] rounded-3xl border p-4 space-y-4"
    >
      <h3 className="font-extrabold text-lg">Nieuw spel toevoegen</h3>

      <div className="space-y-1">
        <label htmlFor="game-name" className="text-sm font-bold block">
          Naam
        </label>
        <input
          id="game-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Wingspan"
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="game-emoji" className="text-sm font-bold block">
          Emoji
        </label>
        <input
          id="game-emoji"
          type="text"
          value={emoji}
          onChange={(e) => { setEmoji(e.target.value); setEmojiManuallySet(true); }}
          placeholder="🎲"
          className="w-full px-3 py-2 rounded-xl border font-semibold text-2xl outline-none focus:border-[var(--color-coral)]"
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          maxLength={4}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="game-category" className="text-sm font-bold block">
          Categorie
        </label>
        <select
          id="game-category"
          value={category}
          onChange={(e) => {
            const newCat = e.target.value as GameCategory;
            setCategory(newCat);
            if (!emojiManuallySet) {
              setEmoji(categoryDefaultEmoji[newCat]);
            }
          }}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
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

      {/* Laagste score wint */}
      <div className="flex items-center justify-between">
        <label htmlFor="game-lowest-wins" className="text-sm font-bold">
          Laagste score wint
          <span className="block text-xs font-semibold mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            bijv. golf, Uno
          </span>
        </label>
        <button
          id="game-lowest-wins"
          type="button"
          role="switch"
          aria-checked={lowestScoreWins}
          onClick={() => setLowestScoreWins((v) => !v)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
          style={{ backgroundColor: lowestScoreWins ? "var(--color-coral)" : "var(--border)" }}
        >
          <span
            className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
            style={{ transform: lowestScoreWins ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
          />
        </button>
      </div>

      {/* Aantal spelers */}
      <div className="space-y-1">
        <label className="text-sm font-bold block">Aantal spelers</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="game-min-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Min
            </label>
            <input
              id="game-min-players"
              type="number"
              min={1}
              max={20}
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
            />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>–</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="game-max-players" className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Max
            </label>
            <input
              id="game-max-players"
              type="number"
              min={1}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-xl border font-bold text-sm text-center outline-none focus:border-[var(--color-coral)]"
              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>spelers</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
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
