"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveInheritedMetadata } from "@/lib/game-metadata";
import type { Game, ParentGameRef } from "@/lib/schemas";

interface GameInfoProps {
  game: Game & { parent?: ParentGameRef | null };
}

/**
 * Omschrijving, speluitleg en de variant-koppeling.
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

  const hasText = Boolean(description || rulesSummary || game.variant_note);

  // Niets te tonen: wijs naar het bewerkformulier in plaats van een leeg kaartje.
  if (!hasText) {
    return <EmptyState />;
  }

  const longDescription = (description?.length ?? 0) > 200;

  return (
    <div className="bg-[var(--card)] rounded-3xl p-4 border space-y-3">
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
    </div>
  );
}

/**
 * Voor spellen zonder enige tekst. Bewust zichtbaar in plaats van stilte: dit zijn
 * de spellen waar alleen de gebruiker zelf iets zinnigs over kan schrijven.
 */
function EmptyState() {
  return (
    <div
      className="rounded-3xl p-4"
      style={{ backgroundColor: "var(--color-warm-gray)" }}
    >
      <div className="font-extrabold text-sm">✍️ Nog geen uitleg voor dit spel</div>
      <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
        Schrijf de omschrijving en speluitleg zelf via Bewerken ✏️ — daar zet je ook een
        doosfoto neer.
      </div>
    </div>
  );
}
