/**
 * Losse module zonder imports, bewust apart van game-metadata.ts.
 *
 * GameCover is een client-component en heeft alleen deze controles nodig. Zou hij
 * die uit game-metadata.ts halen, dan hangt de hele keten (Supabase-serverclient)
 * aan de clientbundel — nu wegge-tree-shaked, maar één top-level side effect
 * verderop en dat is niet meer zo.
 */

/**
 * Hosts die door de image-optimizer van Next mogen.
 * MOET gelijk blijven aan images.remotePatterns in next.config.ts — staat een host
 * daar niet in, dan geeft de optimizer een 400 in plaats van netjes te falen.
 *
 * Alleen de BoardGameGeek-CDN's. Hun API vraagt sinds juli 2025 een sleutel, maar de
 * plaatjes zelf zijn vrij bereikbaar, en het is de meest voor de hand liggende plek om
 * met de hand een doosfoto vandaan te plakken.
 */
export const OPTIMIZED_IMAGE_HOSTS = ["cf.geekdo-images.com", "images.boardgamegeek.com"];

/**
 * Kunnen we van deze URL überhaupt een plaatje maken?
 *
 * Alleen https: een http-afbeelding wordt door de browser als mixed content geblokkeerd,
 * dus die zou een stille kapotte foto opleveren in plaats van de emoji-terugval.
 */
export function isDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Mag next/image deze verkleinen, of moet hij ongeoptimaliseerd geladen worden?
 *
 * Een zelf geplakte URL kan van elke host komen. Die door de optimizer sturen zou een
 * 400 geven; het alternatief — een wildcard in remotePatterns — maakt van de deploy een
 * open image-proxy. Vandaar: bekende host = optimaliseren, de rest ongeoptimaliseerd.
 */
export function canOptimizeImage(url: string | null | undefined): boolean {
  if (!isDisplayableImageUrl(url)) return false;
  return OPTIMIZED_IMAGE_HOSTS.includes(new URL(url as string).hostname);
}
