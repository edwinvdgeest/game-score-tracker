"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SpotlightKind } from "@/lib/spotlight";
import { useMinuteClock } from "@/lib/hooks/useClock";
import {
  activeDemotions,
  clearDemotions,
  demoteKind,
  getPrefsSnapshot,
  getServerPrefsSnapshot,
  markHomeVisit,
  restoreKind,
  subscribeToPrefs,
  updatePrefs,
  visitedHomeToday,
  type SpotlightPrefs,
} from "@/lib/spotlight-prefs";

/**
 * De spotlight-voorkeuren van dit apparaat, reactief.
 *
 * useSyncExternalStore in plaats van een eigen state per component: de carrousel schrijft en de
 * navigatiebalk leest, en die twee staan los van elkaar in de boom. Zie lib/hooks/useClock.ts
 * voor dezelfde vorm.
 */
export function useSpotlightPrefs() {
  const prefs: SpotlightPrefs = useSyncExternalStore(
    subscribeToPrefs,
    getPrefsSnapshot,
    getServerPrefsSnapshot
  );

  // De gedeelde minutenklok in plaats van new Date() tijdens de render: dat laatste is
  // onzuiver (zie lib/hooks/useClock.ts) en zou een verlopen voorkeur pas bij de volgende
  // toevallige render laten vallen. Vóór hydratie is de klok 0 en zijn de voorkeuren leeg.
  const now = useMinuteClock();
  const derived = useMemo(() => {
    const reference = new Date(now === 0 ? 0 : now);
    return {
      demoted: activeDemotions(prefs, reference),
      visitedHomeToday: visitedHomeToday(prefs, reference),
    };
  }, [prefs, now]);

  const demote = useCallback((kind: SpotlightKind) => {
    updatePrefs((current) => demoteKind(current, kind, new Date()));
  }, []);

  const restore = useCallback((kind: SpotlightKind) => {
    updatePrefs((current) => restoreKind(current, kind));
  }, []);

  const restoreAll = useCallback(() => {
    updatePrefs(clearDemotions);
  }, []);

  const noteHomeVisit = useCallback(() => {
    updatePrefs((current) => markHomeVisit(current, new Date()));
  }, []);

  return {
    prefs,
    /** Kaartsoorten die nu achteraan liggen. */
    demoted: derived.demoted,
    /** Is de homepage vandaag al geopend? Bepaalt of de stip bij 🎮 nog zin heeft. */
    visitedHomeToday: derived.visitedHomeToday,
    demote,
    restore,
    restoreAll,
    noteHomeVisit,
  };
}
