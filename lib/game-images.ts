/**
 * Losse module zonder imports, bewust apart van game-metadata.ts.
 *
 * GameCover is een client-component en heeft alleen deze controle nodig. Zou hij
 * die uit game-metadata.ts halen, dan hangt de hele keten (Supabase-serverclient,
 * XML-parser) aan de clientbundel — nu wegge-tree-shaked, maar één top-level side
 * effect verderop en dat is niet meer zo.
 */

/**
 * Hosts waarvan next/image afbeeldingen mag laden.
 * MOET gelijk blijven aan images.remotePatterns in next.config.ts — staat een host
 * daar niet in, dan geeft de image-optimizer een 400 in plaats van netjes te falen.
 */
export const ALLOWED_IMAGE_HOSTS = ["cf.geekdo-images.com", "images.boardgamegeek.com"];

export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
