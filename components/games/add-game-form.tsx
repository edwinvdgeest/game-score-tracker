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

export function AddGameForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [category, setCategory] = useState<GameCategory>("bordspel");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji, category }),
      });

      if (!response.ok) {
        throw new Error("Opslaan mislukt");
      }

      toast.success(`${emoji} ${name} toegevoegd! 🎉`);
      setName("");
      setEmoji("🎲");
      setCategory("bordspel");
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
      className="bg-white rounded-3xl border p-4 space-y-4"
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
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🎲"
          className="w-full px-3 py-2 rounded-xl border font-semibold text-2xl outline-none focus:border-[var(--color-coral)]"
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
          onChange={(e) => setCategory(e.target.value as GameCategory)}
          className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)] bg-white"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-xl border font-bold text-sm cursor-pointer hover:bg-gray-50"
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
