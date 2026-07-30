/**
 * Voorkeuren voor de spotlight, per apparaat.
 *
 * Twee dingen worden onthouden: welke kaartsoorten je hebt weggetikt ("minder van dit") en
 * wanneer je de homepage voor het laatst opende — dat laatste bepaalt of de stip bij 🎮 nog
 * nodig is. Bewust localStorage en geen tabel: het is een voorkeur van dit toestel, niet van
 * het huishouden, en jij en Lisanne mogen een andere mix willen.
 *
 * Dit is de eerste localStorage in de app, dus alles staat expliciet:
 * - de sleutel heeft een versienummer, zodat een volgende vorm de oude niet hoeft te lezen;
 * - elke aanraking zit in try/catch (Safari in privé-modus gooit al bij setItem);
 * - er wordt niets gelezen tijdens SSR, en de server-snapshot is leeg zodat de eerste render
 *   gelijk is aan de server-HTML.
 *
 * De rekenfuncties zijn puur en getest; de store eronder is dezelfde vorm die
 * lib/hooks/useClock.ts gebruikt, zodat de carrousel kan schrijven en de navigatiebalk het
 * meteen ziet.
 */

import { differenceInCalendarDays } from "date-fns";
import type { SpotlightKind } from "@/lib/spotlight";

const STORAGE_KEY = "spelscores:spotlight:v1";

/** Hoe lang een weggetikte kaartsoort onderaan blijft liggen. */
export const DEMOTE_DAYS = 30;

export type SpotlightPrefs = {
  /** Kaartsoort → ISO-datum tot wanneer die achteraan blijft. */
  demoted: Partial<Record<SpotlightKind, string>>;
  /** Laatste bezoek aan de homepage, ISO. */
  lastHomeVisit?: string;
};

export const EMPTY_PREFS: SpotlightPrefs = { demoted: {} };

// ─── Pure rekenfuncties ───────────────────────────────────────────────────────

/** Weggetikte soorten die nu nog gelden; verlopen items vallen weg. */
export function activeDemotions(
  prefs: SpotlightPrefs,
  now: Date
): SpotlightKind[] {
  return (Object.entries(prefs.demoted) as Array<[SpotlightKind, string]>)
    .filter(([, until]) => new Date(until).getTime() > now.getTime())
    .map(([kind]) => kind);
}

/** Zet een kaartsoort DEMOTE_DAYS dagen achteraan. */
export function demoteKind(
  prefs: SpotlightPrefs,
  kind: SpotlightKind,
  now: Date
): SpotlightPrefs {
  const until = new Date(now);
  until.setDate(until.getDate() + DEMOTE_DAYS);
  return {
    ...prefs,
    demoted: { ...pruneDemotions(prefs, now), [kind]: until.toISOString() },
  };
}

/** Eén soort terugzetten (de "ongedaan maken" in de toast). */
export function restoreKind(
  prefs: SpotlightPrefs,
  kind: SpotlightKind
): SpotlightPrefs {
  const demoted = { ...prefs.demoted };
  delete demoted[kind];
  return { ...prefs, demoted };
}

/** Alles terug. */
export function clearDemotions(prefs: SpotlightPrefs): SpotlightPrefs {
  return { ...prefs, demoted: {} };
}

export function markHomeVisit(prefs: SpotlightPrefs, now: Date): SpotlightPrefs {
  return { ...prefs, lastHomeVisit: now.toISOString() };
}

export function visitedHomeToday(prefs: SpotlightPrefs, now: Date): boolean {
  if (!prefs.lastHomeVisit) return false;
  const last = new Date(prefs.lastHomeVisit);
  if (Number.isNaN(last.getTime())) return false;
  return differenceInCalendarDays(now, last) === 0;
}

/** Verlopen items opruimen, zodat de opslag niet volloopt met oude soorten. */
function pruneDemotions(
  prefs: SpotlightPrefs,
  now: Date
): Partial<Record<SpotlightKind, string>> {
  const kept: Partial<Record<SpotlightKind, string>> = {};
  for (const kind of activeDemotions(prefs, now)) {
    kept[kind] = prefs.demoted[kind];
  }
  return kept;
}

/** Leest onbekende invoer (localStorage, een oude versie) als bruikbare voorkeuren. */
export function parsePrefs(raw: string | null): SpotlightPrefs {
  if (!raw) return EMPTY_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_PREFS;
    const record = parsed as Record<string, unknown>;

    const demoted: Partial<Record<SpotlightKind, string>> = {};
    if (record.demoted && typeof record.demoted === "object") {
      for (const [kind, until] of Object.entries(
        record.demoted as Record<string, unknown>
      )) {
        if (typeof until === "string" && !Number.isNaN(new Date(until).getTime())) {
          demoted[kind as SpotlightKind] = until;
        }
      }
    }

    const lastHomeVisit =
      typeof record.lastHomeVisit === "string" ? record.lastHomeVisit : undefined;

    return lastHomeVisit ? { demoted, lastHomeVisit } : { demoted };
  } catch {
    return EMPTY_PREFS;
  }
}

// ─── Store (client) ───────────────────────────────────────────────────────────

let snapshot: SpotlightPrefs = EMPTY_PREFS;
let loaded = false;
const listeners = new Set<() => void>();

function read(): SpotlightPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_PREFS;
  }
}

function write(prefs: SpotlightPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Geen opslag beschikbaar (privé-modus, volle schijf): de voorkeur geldt dan alleen deze
    // sessie. Dat is beter dan een crash op een tik die "minder van dit" heet.
  }
}

/** Abonneren op wijzigingen; ook een ander tabblad wordt opgepikt. */
export function subscribeToPrefs(onChange: () => void): () => void {
  if (!loaded) {
    snapshot = read();
    loaded = true;
  }
  listeners.add(onChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = read();
    for (const listener of listeners) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getPrefsSnapshot(): SpotlightPrefs {
  if (!loaded && typeof window !== "undefined") {
    snapshot = read();
    loaded = true;
  }
  return snapshot;
}

/** Server-snapshot: leeg, zodat de eerste client-render gelijk is aan de server-HTML. */
export function getServerPrefsSnapshot(): SpotlightPrefs {
  return EMPTY_PREFS;
}

/** Voorkeuren aanpassen, opslaan en iedereen die meekijkt bijwerken. */
export function updatePrefs(
  change: (prefs: SpotlightPrefs) => SpotlightPrefs
): SpotlightPrefs {
  const next = change(getPrefsSnapshot());
  snapshot = next;
  loaded = true;
  write(next);
  for (const listener of listeners) listener();
  return next;
}

/** Alleen voor tests: store en opslag terug naar leeg. */
export function resetPrefsForTest(): void {
  snapshot = EMPTY_PREFS;
  loaded = false;
  listeners.clear();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // niets te doen
  }
}
