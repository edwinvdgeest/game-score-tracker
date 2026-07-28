/**
 * BoardGameGeek XML API 2 — client en parsers.
 *
 * De parsers zijn puur en worden getest tegen de fixtures in bgg.fixtures.ts.
 * De fetch-helpers zijn de enige I/O en houden rekening met drie BGG-eigenaardigheden:
 *   - HTTP 202: het verzoek staat in de wachtrij, opnieuw pollen
 *   - HTTP 429: streng rate-limit, exponentieel terugvallen
 *   - trage responses: harde timeout
 *
 * BGG_BASE_URL kan naar een lokale server wijzen om het hele pad te testen zonder
 * netwerktoegang (zie het backfill-script en de README).
 */

import { XMLParser } from "fast-xml-parser";

export interface BggSearchHit {
  id: number;
  name: string;
  yearPublished: number | null;
  isPrimary: boolean;
}

export interface BggThing {
  id: number;
  name: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTimeMinutes: number | null;
  rating: number | null;
  weight: number | null;
}

/** Gegooid als BGG onbereikbaar is of blijft weigeren. */
export class BggUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BggUnavailableError";
  }
}

const DEFAULT_BASE_URL = "https://boardgamegeek.com/xmlapi2";

function baseUrl(): string {
  return process.env.BGG_BASE_URL || DEFAULT_BASE_URL;
}

// parseAttributeValue staat bewust uit: BGG gebruikt "", "0" en "Not Ranked" door
// elkaar voor "onbekend". Alles als string binnenhalen en zelf converteren maakt
// die gevallen expliciet in plaats van dat er stilletjes een 0 doorheen glipt.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  // processEntities alléén dekt de vijf XML-entiteiten (&amp; &lt; ...) maar laat
  // numerieke entiteiten in attribuutwaarden staan. BGG-spelnamen zitten er vol mee
  // ("Hey, That&#039;s My Fish!", "Gl&#252;ck"), en die gaan rechtstreeks het
  // matchalgoritme in — een half gedecodeerde naam levert een verkeerde match op,
  // geen zichtbare fout. htmlEntities: true is daarom niet optioneel.
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  isArray: (name) => ["item", "name", "link"].includes(name),
});

function toIntOrNull(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return parsed;
}

function toFloatOrNull(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return parsed;
}

function attr(node: unknown, key: string): string | null {
  if (!node || typeof node !== "object") return null;
  const value = (node as Record<string, unknown>)[`@_${key}`];
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

export function buildBggSearchUrl(query: string, base = baseUrl()): string {
  return `${base}/search?query=${encodeURIComponent(query)}&type=boardgame`;
}

export function buildBggThingUrl(id: number, base = baseUrl()): string {
  return `${base}/thing?id=${id}&stats=1`;
}

/** Publieke BGG-pagina, voor de "Bekijk op BGG"-link in de UI. */
export function bggGamePageUrl(id: number): string {
  return `https://boardgamegeek.com/boardgame/${id}`;
}

export function parseBggSearchXml(xml: string): BggSearchHit[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const items = asArray((doc?.items as Record<string, unknown> | undefined)?.item);

  const hits: BggSearchHit[] = [];
  for (const item of items) {
    const id = toIntOrNull(attr(item, "id"));
    if (id === null) continue;

    // Een zoekresultaat heeft normaal één <name>, maar de primaire heeft voorrang.
    const names = asArray((item as Record<string, unknown>).name);
    const primary = names.find((n) => attr(n, "type") === "primary");
    const chosen = primary ?? names[0];
    const name = attr(chosen, "value");
    if (!name) continue;

    const yearNode = (item as Record<string, unknown>).yearpublished;

    hits.push({
      id,
      name,
      yearPublished: toIntOrNull(attr(yearNode, "value")),
      isPrimary: attr(chosen, "type") === "primary",
    });
  }
  return hits;
}

export function parseBggThingXml(xml: string): BggThing | null {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const items = asArray((doc?.items as Record<string, unknown> | undefined)?.item);
  const item = items[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  const id = toIntOrNull(attr(item, "id"));
  if (id === null) return null;

  const names = asArray(item.name);
  const primary = names.find((n) => attr(n, "type") === "primary") ?? names[0];
  const name = attr(primary, "value");
  if (!name) return null;

  const ratings = (item.statistics as Record<string, unknown> | undefined)?.ratings as
    | Record<string, unknown>
    | undefined;

  const rating = toFloatOrNull(attr(ratings?.average, "value"));
  const weight = toFloatOrNull(attr(ratings?.averageweight, "value"));

  return {
    id,
    name,
    imageUrl: typeof item.image === "string" ? item.image : null,
    thumbnailUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
    yearPublished: toIntOrNull(attr(item.yearpublished, "value")),
    minPlayers: toIntOrNull(attr(item.minplayers, "value")),
    maxPlayers: toIntOrNull(attr(item.maxplayers, "value")),
    playingTimeMinutes: toIntOrNull(attr(item.playingtime, "value")),
    // Afronden op één decimaal: de kolom is numeric(3,1) en 7.03812 in de UI is ruis.
    rating: rating === null ? null : Math.round(rating * 10) / 10,
    weight: weight === null ? null : Math.round(weight * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

export interface BggFetchOptions {
  signal?: AbortSignal;
  /** Wordt aangeroepen bij een wachtperiode, zodat een backoff niet op een hang lijkt. */
  onWait?: (ms: number, reason: "queued" | "rate-limit") => void;
}

const QUEUE_RETRY_MS = 2000;
const MAX_QUEUE_RETRIES = 5;
const RATE_LIMIT_BACKOFF_MS = [5000, 10_000, 20_000];
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBggXml(url: string, opts: BggFetchOptions = {}): Promise<string> {
  let queueRetries = 0;
  let rateLimitRetries = 0;

  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: opts.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: "application/xml",
          "User-Agent": "spelscores/1.0 (persoonlijke scoretracker)",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "onbekende netwerkfout";
      throw new BggUnavailableError(`BGG is niet bereikbaar: ${message}`);
    }

    // 202 = "we zetten je verzoek in de wachtrij, kom zo terug"
    if (response.status === 202) {
      if (queueRetries >= MAX_QUEUE_RETRIES) {
        throw new BggUnavailableError("BGG blijft het verzoek in de wachtrij houden (202)");
      }
      queueRetries++;
      opts.onWait?.(QUEUE_RETRY_MS, "queued");
      await sleep(QUEUE_RETRY_MS);
      continue;
    }

    if (response.status === 429) {
      const wait = RATE_LIMIT_BACKOFF_MS[rateLimitRetries];
      if (wait === undefined) {
        throw new BggUnavailableError("BGG rate-limit bereikt; probeer het later opnieuw (429)");
      }
      rateLimitRetries++;
      opts.onWait?.(wait, "rate-limit");
      await sleep(wait);
      continue;
    }

    if (!response.ok) {
      throw new BggUnavailableError(`BGG gaf status ${response.status}`);
    }

    return await response.text();
  }
}

export async function fetchBggSearch(
  query: string,
  opts: BggFetchOptions = {}
): Promise<BggSearchHit[]> {
  const xml = await fetchBggXml(buildBggSearchUrl(query), opts);
  return parseBggSearchXml(xml);
}

export async function fetchBggThing(
  id: number,
  opts: BggFetchOptions = {}
): Promise<BggThing | null> {
  const xml = await fetchBggXml(buildBggThingUrl(id), opts);
  return parseBggThingXml(xml);
}
