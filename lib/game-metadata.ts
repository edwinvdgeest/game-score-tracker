/**
 * Spel-metadata: wat een spel toont aan doosfoto en tekst, en wanneer het zin heeft
 * daar iets voor te genereren.
 *
 * Hier stond eerder ook de koppeling met BoardGameGeek. Die is verwijderd: BGG eist
 * sinds 2 juli 2025 registratie en een Bearer-token voor de XML API. Doosfoto's gaan nu
 * met de hand, via het URL-veld in het bewerkformulier.
 */

import type { Game, ParentGameRef } from "@/lib/schemas";

// Doorgegeven zodat bestaande imports blijven werken; de implementatie staat in
// game-images.ts, dat geen imports heeft en dus veilig is voor client-componenten.
export {
  OPTIMIZED_IMAGE_HOSTS,
  isDisplayableImageUrl,
  canOptimizeImage,
} from "@/lib/game-images";

/**
 * Mag er een Nederlandse tekst gegenereerd worden?
 *
 * Nee zodra de tekst handmatig is aangepast, al een herkomst heeft, al gevuld is,
 * of van een hoofdspel geërfd kan worden. Er is op dit moment geen aanroeper — zie
 * de kop van lib/claude.ts — maar de regel hoort bij de tekst, niet bij de generator.
 */
export function shouldGenerateText(
  game: Pick<Game, "description" | "rules_summary" | "text_locked" | "text_source">,
  parent?: Pick<Game, "description" | "rules_summary"> | null
): boolean {
  if (game.text_locked) return false;
  if (game.text_source) return false;
  if (game.description && game.rules_summary) return false;
  if (parent?.description && parent?.rules_summary) return false;
  return true;
}

export interface ResolvedGameMetadata {
  imageUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  rulesSummary: string | null;
  /** True als de getoonde afbeelding of tekst van het hoofdspel komt. */
  inheritedFromParent: boolean;
}

/**
 * Bepaalt wat er getoond wordt voor een spel: eigen gegevens, en anders die van
 * het hoofdspel. Zo krijgen alle tien de Keer op Keer-varianten een doosfoto
 * zodra het hoofdspel er één heeft.
 */
export function resolveInheritedMetadata(
  game: Pick<Game, "image_url" | "thumbnail_url" | "description" | "rules_summary">,
  parent?: ParentGameRef | null
): ResolvedGameMetadata {
  const imageUrl = game.image_url ?? parent?.image_url ?? null;
  const thumbnailUrl = game.thumbnail_url ?? parent?.thumbnail_url ?? null;
  const description = game.description ?? parent?.description ?? null;
  const rulesSummary = game.rules_summary ?? parent?.rules_summary ?? null;

  const inheritedFromParent = Boolean(
    (!game.image_url && parent?.image_url) ||
      (!game.thumbnail_url && parent?.thumbnail_url) ||
      (!game.description && parent?.description) ||
      (!game.rules_summary && parent?.rules_summary)
  );

  return { imageUrl, thumbnailUrl, description, rulesSummary, inheritedFromParent };
}
