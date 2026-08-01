"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isDisplayableImageUrl } from "@/lib/game-images";
import { apiErrorMessage } from "@/lib/utils";
import type { Game, GameCategory } from "@/lib/schemas";
import { SettingToggle } from "./setting-toggle";
import { RoundFormatPicker } from "./round-format-picker";
import { normalizeRoundConfig, type RoundFormat } from "@/lib/rounds";

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
  const [lowestScoreWins, setLowestScoreWins] = useState(game.lowest_score_wins ?? false);
  const [starterMatters, setStarterMatters] = useState(game.starter_matters ?? true);
  const [roundFormat, setRoundFormat] = useState<RoundFormat>(game.round_format ?? "geen");
  const [roundCount, setRoundCount] = useState(
    game.round_count != null ? String(game.round_count) : ""
  );
  const [roundTarget, setRoundTarget] = useState(
    game.round_target != null ? String(game.round_target) : ""
  );
  const [minPlayers, setMinPlayers] = useState<string>(String(game.min_players ?? 2));
  const [maxPlayers, setMaxPlayers] = useState<string>(String(game.max_players ?? 4));
  const [imageUrl, setImageUrl] = useState(game.image_url ?? "");
  const [description, setDescription] = useState(game.description ?? "");
  const [rulesSummary, setRulesSummary] = useState(game.rules_summary ?? "");
  const [variantNote, setVariantNote] = useState(game.variant_note ?? "");
  const [parentGameId, setParentGameId] = useState(game.parent_game_id ?? "");
  const [textOpen, setTextOpen] = useState(false);
  const [otherGames, setOtherGames] = useState<Game[]>([]);

  // Alleen ophalen als het tekstblok daadwerkelijk opengaat.
  useEffect(() => {
    if (!textOpen || otherGames.length > 0) return;
    void fetch("/api/games")
      .then((r) => (r.ok ? r.json() : []))
      .then((games: Game[]) => setOtherGames(games.filter((g) => g.id !== game.id)))
      .catch(() => setOtherGames([]));
  }, [textOpen, otherGames.length, game.id]);

  const trimmedImageUrl = imageUrl.trim();
  const imageUrlValid = trimmedImageUrl === "" || isDisplayableImageUrl(trimmedImageUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !imageUrlValid) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          // normalizeRoundConfig nult het rondeveld dat niet bij de gekozen vorm hoort
          // en zet lowest_score_wins uit bij 'winnaar'.
          normalizeRoundConfig({
            name: name.trim(),
            emoji,
            category,
            difficulty: difficulty ?? null,
            min_players: parseInt(minPlayers, 10) || 2,
            max_players: parseInt(maxPlayers, 10) || 4,
            lowest_score_wins: lowestScoreWins,
            starter_matters: starterMatters,
            round_format: roundFormat,
            round_count: parseInt(roundCount, 10) || null,
            round_target: parseInt(roundTarget, 10) || null,
          })
        ),
      });

      if (!response.ok) throw new Error(await apiErrorMessage(response));

      // Doosfoto, tekst en variant-koppeling lopen via PATCH: die route zet
      // text_locked, zodat een handmatig aangepaste tekst daarna met rust gelaten wordt.
      const metaChanged =
        trimmedImageUrl !== (game.image_url ?? "") ||
        description !== (game.description ?? "") ||
        rulesSummary !== (game.rules_summary ?? "") ||
        variantNote !== (game.variant_note ?? "") ||
        parentGameId !== (game.parent_game_id ?? "");

      if (metaChanged) {
        const patchResponse = await fetch(`/api/games/${game.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: trimmedImageUrl || null,
            description: description.trim() || null,
            rules_summary: rulesSummary.trim() || null,
            variant_note: variantNote.trim() || null,
            parent_game_id: parentGameId || null,
          }),
        });
        if (!patchResponse.ok) throw new Error(await apiErrorMessage(patchResponse));
      }

      toast.success(`${emoji} ${name} bijgewerkt! ✏️`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er ging iets mis. Probeer opnieuw.");
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
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
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
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
          maxLength={4}
        />
      </div>

      {/* Doosfoto. Leeg = de emoji; een variant zonder eigen foto pakt die van het
          hoofdspel. Zie GameCover. */}
      <div className="space-y-1">
        <label htmlFor="edit-game-image" className="text-sm font-bold block">
          🖼️ Doosfoto (URL)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="edit-game-image"
            type="url"
            inputMode="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://cf.geekdo-images.com/..."
            aria-invalid={!imageUrlValid}
            aria-describedby="edit-game-image-hint"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
              borderColor: imageUrlValid ? undefined : "var(--color-coral)",
            }}
          />
          {/* Bewust een gewone img en geen next/image: dit is een tijdelijk voorbeeld
              en hoeft niet langs de optimizer. */}
          {imageUrlValid && trimmedImageUrl !== "" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={trimmedImageUrl}
              alt=""
              width={40}
              height={40}
              className="rounded-xl object-cover flex-shrink-0"
              style={{ width: 40, height: 40, backgroundColor: "var(--color-warm-gray)" }}
            />
          )}
        </div>
        <p
          id="edit-game-image-hint"
          className="text-xs font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {imageUrlValid
            ? "Tip: open het spel op boardgamegeek.com en kopieer het afbeeldingsadres. Leeg laten = de emoji."
            : "Dat is geen geldige https-URL."}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-game-category" className="text-sm font-bold block">
          Categorie
        </label>
        <select
          id="edit-game-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GameCategory)}
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

      <RoundFormatPicker
        idPrefix="edit"
        format={roundFormat}
        onFormatChange={setRoundFormat}
        count={roundCount}
        onCountChange={setRoundCount}
        target={roundTarget}
        onTargetChange={setRoundTarget}
      />

      {/* Bij "rondes met een winnaar" is de score het aantal gewonnen rondes; laagste
          wint zou de winnaar omdraaien, dus die keuze bestaat daar niet. */}
      {roundFormat !== "winnaar" && (
        <SettingToggle
          id="edit-lowest-wins"
          label="Laagste score wint"
          hint="bijv. golf, Uno"
          checked={lowestScoreWins}
          onChange={setLowestScoreWins}
        />
      )}

      <SettingToggle
        id="edit-starter-matters"
        label="Wie begint maakt uit"
        hint="uit bij bijv. Take 5 — de beginner-stap vervalt dan"
        checked={starterMatters}
        onChange={setStarterMatters}
      />

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
              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
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
              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>spelers</span>
        </div>
      </div>

      {/* Omschrijving en speluitleg */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setTextOpen(!textOpen)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-[var(--muted)]"
          style={{ backgroundColor: "var(--color-warm-gray)" }}
          aria-expanded={textOpen}
        >
          <span>✍️ Omschrijving en speluitleg</span>
          <span className="text-xs">{textOpen ? "▲" : "▼"}</span>
        </button>

        {textOpen && (
          <div className="space-y-3 px-1">
            <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Wat je hier zelf invult blijft staan: het automatisch ophalen laat een
              handmatig aangepaste tekst met rust.
            </p>

            <div className="space-y-1">
              <label htmlFor="edit-parent-game" className="text-sm font-bold block">
                Variant van
              </label>
              <select
                id="edit-parent-game"
                value={parentGameId}
                onChange={(e) => setParentGameId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
                style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
              >
                <option value="">— geen, dit is een eigen spel —</option>
                {otherGames.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.emoji} {other.name}
                  </option>
                ))}
              </select>
              <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                Een variant erft de doosfoto en de uitleg van het hoofdspel.
              </p>
            </div>

            {parentGameId && (
              <div className="space-y-1">
                <label htmlFor="edit-variant-note" className="text-sm font-bold block">
                  Wat is er anders?
                </label>
                <input
                  id="edit-variant-note"
                  type="text"
                  value={variantNote}
                  onChange={(e) => setVariantNote(e.target.value)}
                  placeholder="bijv. scoreblad met kettingen"
                  className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
                  style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="edit-description" className="text-sm font-bold block">
                Omschrijving
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Twee of drie zinnen: waar gaat het spel over?"
                className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
                style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-rules" className="text-sm font-bold block">
                Speluitleg
              </label>
              <textarea
                id="edit-rules"
                value={rulesSummary}
                onChange={(e) => setRulesSummary(e.target.value)}
                rows={8}
                maxLength={3000}
                placeholder={"Doel: ...\n\nVerloop: ...\n\nWinnen: ...\n\nTip: ..."}
                className="w-full px-3 py-2 rounded-xl border font-semibold text-sm outline-none focus:border-[var(--color-coral)]"
                style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
              />
            </div>
          </div>
        )}
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
          disabled={saving || !name.trim() || !imageUrlValid}
          className="flex-1 py-2 rounded-xl text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
