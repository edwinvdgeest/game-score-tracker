"use client";

import { useState } from "react";
import Link from "next/link";
import { bggGamePageUrl } from "@/lib/bgg";
import { resolveInheritedMetadata } from "@/lib/game-metadata";
import { MetadataRefresh } from "@/components/games/metadata-refresh";
import type { Game, ParentGameRef } from "@/lib/schemas";

const CHIP_CLASS = "text-xs font-bold px-2 py-0.5 rounded-full";
const CHIP_STYLE = {
  backgroundColor: "var(--color-warm-gray)",
  color: "var(--muted-foreground)",
} as const;

interface GameInfoProps {
  game: Game & { parent?: ParentGameRef | null };
}

/**
 * Omschrijving, speluitleg en de BGG-feiten.
 *
 * De speluitleg staat standaard dichtgeklapt: het is het langste veld en je leest
 * het één keer. Zo blijft het visuele zwaartepunt van de pagina op de statistieken
 * liggen, waar de app om draait.
 */
export function GameInfo({ game }: GameInfoProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const parent = game.parent ?? null;
  const { description, rulesSummary } = resolveInheritedMetadata(game, parent);

  const hasFacts = Boolean(game.year_published || game.playing_time_minutes || game.bgg_id);
  const hasText = Boolean(description || rulesSummary || game.variant_note);

  // Niets te tonen én niets op te halen: laat de pagina zoals hij was.
  if (!hasFacts && !hasText) {
    return <EmptyState game={game} />;
  }

  const longDescription = (description?.length ?? 0) > 200;

  return (
    <div className="bg-[var(--card)] rounded-3xl p-4 border space-y-3">
      {hasFacts && (
        <div className="flex items-center gap-2 flex-wrap">
          {game.year_published && (
            <span className={CHIP_CLASS} style={CHIP_STYLE}>
              📅 {game.year_published}
            </span>
          )}
          {game.playing_time_minutes && (
            <span className={CHIP_CLASS} style={CHIP_STYLE}>
              ⏱️ ~{game.playing_time_minutes} min
            </span>
          )}
          {game.bgg_id && (
            <a
              href={bggGamePageUrl(game.bgg_id)}
              target="_blank"
              rel="noreferrer"
              className={`${CHIP_CLASS} hover:underline`}
              style={CHIP_STYLE}
            >
              {game.bgg_rating ? `⭐ ${game.bgg_rating.toFixed(1)} op BGG` : "🔗 Bekijk op BGG"}
            </a>
          )}
        </div>
      )}

      {parent && (
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Variant van{" "}
          <Link
            href={`/games/${parent.id}`}
            className="font-extrabold hover:underline"
            style={{ color: "var(--color-coral)" }}
          >
            {parent.emoji} {parent.name}
          </Link>
          {game.variant_note ? ` — ${game.variant_note}` : null}
        </p>
      )}

      {description && (
        <div>
          <p
            className={`text-sm font-semibold whitespace-pre-line ${
              longDescription && !descriptionOpen ? "line-clamp-3" : ""
            }`}
          >
            {description}
          </p>
          {longDescription && (
            <button
              onClick={() => setDescriptionOpen(!descriptionOpen)}
              className="text-xs font-bold mt-1 cursor-pointer hover:underline"
              style={{ color: "var(--color-coral)" }}
            >
              {descriptionOpen ? "Minder" : "Meer lezen"}
            </button>
          )}
        </div>
      )}

      {rulesSummary && (
        <div>
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl font-extrabold text-sm cursor-pointer hover:bg-[var(--muted)]"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
            aria-expanded={rulesOpen}
          >
            <span>📖 Speluitleg</span>
            <span className="text-xs">{rulesOpen ? "▲" : "▼"}</span>
          </button>
          {rulesOpen && (
            <div className="text-sm font-semibold whitespace-pre-line mt-2 px-1 space-y-2">
              {rulesSummary}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <MetadataRefresh game={game} />
        {game.bgg_sync_error && (
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            ⚠️ {game.bgg_sync_error}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Voor spellen zonder enige metadata. Bewust zichtbaar in plaats van stilte: dit
 * zijn de spellen waar alleen de gebruiker zelf iets zinnigs over kan schrijven.
 */
function EmptyState({ game }: GameInfoProps) {
  return (
    <div
      className="rounded-3xl p-4 flex items-center justify-between gap-3 flex-wrap"
      style={{ backgroundColor: "var(--color-warm-gray)" }}
    >
      <div>
        <div className="font-extrabold text-sm">✍️ Nog geen uitleg voor dit spel</div>
        <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Haal de gegevens op bij BoardGameGeek of schrijf de uitleg zelf via Bewerken.
        </div>
      </div>
      <MetadataRefresh game={game} />
    </div>
  );
}
