/**
 * Het juiste BoardGameGeek-spel kiezen bij een spelnaam uit de app.
 *
 * Volledig puur en deterministisch, zodat dit tegen fixtures te testen is zonder
 * netwerk. Twee ingangen op één algoritme: pickBestBggMatch voor het automatische
 * pad, rankBggCandidates voor de "verkeerd spel?"-kiezer in de UI.
 */

import type { BggSearchHit } from "@/lib/bgg";

export interface BggMatch {
  hit: BggSearchHit;
  score: number;
  /** True als nummer twee er vlak achter zit — dan is handmatige controle verstandig. */
  ambiguous: boolean;
}

/** Onder deze score wordt een treffer niet vertrouwd. */
export const MIN_MATCH_SCORE = 0.62;

/**
 * Nederlandse titels die op BGG onder een andere naam staan. Zonder deze tabel
 * vindt het algoritme ze niet: het kan niet weten dat Regenwormen hetzelfde spel
 * is als Heckmeck am Bratwurmeck.
 *
 * Sleutels zijn al genormaliseerd (zie normalizeGameName); de lookup normaliseert
 * de zoekterm eerst. De alias vervangt alleen de zoekterm richting BGG, nooit de
 * naam in de app.
 *
 * Vul aan zodra het backfill-script een no-match rapporteert.
 */
export const BGG_NAME_ALIASES: Record<string, string> = {
  regenwormen: "Heckmeck am Bratwurmeck",
  "vlotte geesten": "Geistesblitz",
  "take 5": "6 nimmt!",
  "el dorado": "The Quest for El Dorado",
  "keer op keer": "Noch mal!",
  "keer op keer 2": "Noch mal so gut!",
  "keer op keer kids": "Noch mal Junior!",
  clever: "Ganz schoen clever",
  "dobbel zo clever": "Doppelt so clever",
  "clever tot de 3e macht": "Clever hoch Drei",
  "taco spel": "Taco Cat Goat Cheese Pizza",
  beverbende: "Beverbende",
  pimpampet: "Pim Pam Pet",
};

/**
 * Spellen waar het algoritme structureel niet uitkomt, meestal doordat tientallen
 * heruitgaven exact dezelfde naam dragen. Sleutel is de genormaliseerde naam.
 */
export const BGG_ID_OVERRIDES: Record<string, number> = {
  uno: 2223,
  mikado: 4143,
};

const LEADING_ARTICLE = /^(the|a|an|de|het|een)\s+/;

/**
 * Maakt namen vergelijkbaar: diakritische tekens weg, kleine letters, & als "and",
 * lidwoord vooraan weg, leestekens weg en spaties inklappen.
 *
 * Dat laatste vangt meteen de dubbele spaties die in de spellijst voorkomen
 * ("Keer op keer nog een keer  - lvl 3").
 */
export function normalizeGameName(name: string): string {
  let out = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  // Na het strippen van leestekens kan er een lidwoord vooraan zijn komen te staan.
  out = out.replace(LEADING_ARTICLE, "");
  return out.trim();
}

function tokens(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/** Overeenkomst tussen twee tokenverzamelingen, 0..1. */
function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Score tussen 0 en 1 voor hoe goed een BGG-treffer bij de zoekterm past.
 *
 * De straf voor extra woorden is wat uitbreidingen en heruitgaven onder het
 * basisspel houdt: "Qwixx: Big Points" en "Uno Flip!" verliezen het zo van
 * "Qwixx" en "Uno".
 */
export function scoreBggCandidate(query: string, hit: BggSearchHit): number {
  const q = normalizeGameName(query);
  const h = normalizeGameName(hit.name);
  if (q.length === 0 || h.length === 0) return 0;

  // De basisscores laten bewust ruimte tot 1.0 over voor de bonussen hieronder.
  // Zou een exacte match al 1.0 zijn, dan verdwijnt het onderscheid tussen een
  // primaire en een alternatieve naam in de clamp.
  let score: number;
  if (q === h) {
    score = 0.92;
  } else if (h.startsWith(q) || q.startsWith(h)) {
    score = 0.8;
  } else {
    score = jaccard(tokens(q), tokens(h)) * 0.75;
  }

  if (hit.isPrimary) score += 0.05;
  if (hit.yearPublished !== null) score += 0.03;

  const queryTokens = new Set(tokens(q));
  const extraTokens = tokens(h).filter((t) => !queryTokens.has(t)).length;
  score -= Math.min(extraTokens * 0.04, 0.2);

  return Math.max(0, Math.min(1, score));
}

/** Alle kandidaten gescoord en gesorteerd; gebruikt door de handmatige kiezer. */
export function rankBggCandidates(
  query: string,
  hits: BggSearchHit[],
  limit = 5
): BggMatch[] {
  const scored = hits
    .map((hit) => ({ hit, score: scoreBggCandidate(query, hit), ambiguous: false }))
    // Gelijke score → laagste BGG-id wint. BGG-id's lopen ruwweg chronologisch op,
    // dus bij een reeks heruitgaven met dezelfde naam is dat de oorspronkelijke.
    .sort((a, b) => b.score - a.score || a.hit.id - b.hit.id);

  const [first, second] = scored;
  if (first && second) {
    first.ambiguous = first.score - second.score < 0.05;
  }
  return scored.slice(0, limit);
}

export function pickBestBggMatch(
  query: string,
  hits: BggSearchHit[],
  opts: { minScore?: number } = {}
): BggMatch | null {
  const minScore = opts.minScore ?? MIN_MATCH_SCORE;

  const overrideId = BGG_ID_OVERRIDES[normalizeGameName(query)];
  if (overrideId !== undefined) {
    const hit = hits.find((h) => h.id === overrideId);
    if (hit) return { hit, score: 1, ambiguous: false };
  }

  const ranked = rankBggCandidates(query, hits, hits.length);
  const best = ranked[0];
  if (!best || best.score < minScore) return null;
  return best;
}

/** De zoekterm die richting BGG gaat: de alias als die bestaat, anders de naam zelf. */
export function bggSearchTermFor(gameName: string): string {
  return BGG_NAME_ALIASES[normalizeGameName(gameName)] ?? gameName;
}
