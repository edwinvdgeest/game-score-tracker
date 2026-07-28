/**
 * Spel-metadata: van een BGG-treffer naar een databasekolom, en de orkestratie
 * die het verrijken uitvoert.
 *
 * De pure functies bovenaan zijn getest; enrichGame onderaan is het enige stuk
 * met I/O en wordt gedeeld door de API-route, het backfill-script en het
 * toevoegformulier.
 */

import type { BggThing } from "@/lib/bgg";
import { fetchBggSearch, fetchBggThing } from "@/lib/bgg";
import { bggSearchTermFor, pickBestBggMatch } from "@/lib/bgg-match";
import { getGameById, updateGameMetadata } from "@/lib/queries";
import type { Game, GameMetadataPatch, ParentGameRef } from "@/lib/schemas";
import { isAllowedImageHost } from "@/lib/game-images";

/** Hoe lang na een poging een spel niet opnieuw verrijkt mag worden. */
export const ENRICH_COOLDOWN_MS = 10 * 60 * 1000;

// Doorgegeven zodat bestaande imports blijven werken; de implementatie staat in
// game-images.ts, dat geen imports heeft en dus veilig is voor client-componenten.
export { ALLOWED_IMAGE_HOSTS, isAllowedImageHost } from "@/lib/game-images";

/**
 * Maakt de BGG-omschrijving leesbaar: entiteiten terug naar tekens, HTML-tags eruit,
 * en afkappen op een woordgrens. Wordt alleen gebruikt als bronmateriaal, niet als
 * zichtbare tekst.
 */
export function stripBggHtml(input: string, maxChars = 1200): string {
  const text = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function mapBggThingToGameMetadata(thing: BggThing): GameMetadataPatch {
  return {
    bgg_id: thing.id,
    image_url: isAllowedImageHost(thing.imageUrl) ? thing.imageUrl : null,
    thumbnail_url: isAllowedImageHost(thing.thumbnailUrl) ? thing.thumbnailUrl : null,
    year_published: thing.yearPublished,
    bgg_rating: thing.rating,
    bgg_weight: thing.weight,
    playing_time_minutes: thing.playingTimeMinutes,
    bgg_sync_error: null,
  };
}

/**
 * Mag er een Nederlandse tekst gegenereerd worden?
 *
 * Nee zodra de tekst handmatig is aangepast, al een herkomst heeft, al gevuld is,
 * of van een hoofdspel geërfd kan worden. Daarmee draait Claude hooguit één keer
 * per spel — ook als de cooldown omzeild wordt.
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

export function enrichCooldownRemainingMs(
  bggSyncedAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!bggSyncedAt) return 0;
  const synced = new Date(bggSyncedAt).getTime();
  if (!Number.isFinite(synced)) return 0;
  const elapsed = now.getTime() - synced;
  return elapsed >= ENRICH_COOLDOWN_MS ? 0 : ENRICH_COOLDOWN_MS - elapsed;
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

// ---------------------------------------------------------------------------
// Orkestratie
// ---------------------------------------------------------------------------

export type EnrichResult =
  | { status: "ok"; game: Game; matchedName: string | null; usedClaude: boolean }
  | { status: "no_match"; game: Game }
  | { status: "not_found" }
  | { status: "cooldown"; retryAfterMs: number };

export interface EnrichOptions {
  /** Expliciet BGG-id, gebruikt door de "verkeerd spel?"-kiezer. */
  bggId?: number;
  skipClaude?: boolean;
  /** Negeer de cooldown en ververs ook al gevulde velden. */
  force?: boolean;
  onWait?: (ms: number, reason: "queued" | "rate-limit") => void;
}

export async function enrichGame(
  gameId: string,
  opts: EnrichOptions = {}
): Promise<EnrichResult> {
  const game = await getGameById(gameId);
  if (!game) return { status: "not_found" };

  if (!opts.force && !opts.bggId) {
    const remaining = enrichCooldownRemainingMs(game.bgg_synced_at);
    if (remaining > 0) return { status: "cooldown", retryAfterMs: remaining };
  }

  const parent = game.parent_game_id ? await getGameById(game.parent_game_id) : null;
  const syncedAt = new Date().toISOString();

  let thing: BggThing | null = null;
  let matchedName: string | null = null;
  let syncError: string | null = null;

  try {
    const bggId = await resolveBggId(game, parent, opts);
    if (bggId !== null) {
      thing = await fetchBggThing(bggId, { onWait: opts.onWait });
      if (thing) matchedName = thing.name;
      else syncError = `BGG kent geen spel met id ${bggId}`;
    } else {
      syncError = "Geen BGG-match gevonden";
    }
  } catch (error) {
    syncError = error instanceof Error ? error.message : "Onbekende fout bij BGG";
  }

  const patch: GameMetadataPatch = {
    bgg_synced_at: syncedAt,
    bgg_sync_error: syncError,
  };

  if (thing) {
    const mapped = mapBggThingToGameMetadata(thing);
    // Bestaande waarden blijven staan tenzij force: een handmatig gekozen
    // afbeelding mag niet zomaar overschreven worden.
    for (const [key, value] of Object.entries(mapped) as [
      keyof GameMetadataPatch,
      unknown,
    ][]) {
      if (key === "bgg_sync_error") continue;
      if (!opts.force && game[key as keyof Game] != null) continue;
      Object.assign(patch, { [key]: value });
    }
  }

  let usedClaude = false;
  if (!opts.skipClaude && shouldGenerateText(game, parent)) {
    const { generateDutchGameText, isClaudeEnabled } = await import("@/lib/claude");
    if (isClaudeEnabled()) {
      const text = await generateDutchGameText({
        name: game.name,
        category: game.category,
        minPlayers: game.min_players,
        maxPlayers: game.max_players,
        bggName: thing?.name ?? null,
        yearPublished: thing?.yearPublished ?? null,
        playingTimeMinutes: thing?.playingTimeMinutes ?? null,
      });
      if (text) {
        patch.description = text.description;
        patch.rules_summary = text.rules_summary;
        patch.text_source = "claude";
        usedClaude = true;
      }
    }
  }

  const updated = await updateGameMetadata(game.id, patch);

  if (!thing) return { status: "no_match", game: updated };
  return { status: "ok", game: updated, matchedName, usedClaude };
}

/**
 * Welk BGG-id hoort bij dit spel?
 *
 * Een variant zoekt bewust niet zelf: die neemt het id van het hoofdspel over.
 * Dat scheelt zoekopdrachten en voorkomt dat "Qwixx Ketting" aan een willekeurige
 * uitbreiding gekoppeld raakt.
 */
async function resolveBggId(
  game: Game,
  parent: Game | null,
  opts: EnrichOptions
): Promise<number | null> {
  if (opts.bggId) return opts.bggId;
  if (!opts.force && game.bgg_id) return game.bgg_id;
  if (parent?.bgg_id) return parent.bgg_id;

  const hits = await fetchBggSearch(bggSearchTermFor(game.name), { onWait: opts.onWait });
  const match = pickBestBggMatch(bggSearchTermFor(game.name), hits);
  return match?.hit.id ?? null;
}
