"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Game, Player } from "@/lib/schemas";
import type { SpotlightPayload } from "@/lib/queries";
import { MarathonStartButton } from "@/components/marathon/marathon-start-button";
import { SessionForm, type SessionFormState } from "@/components/quick-log/session-form";
import { useSpotlightPrefs } from "@/lib/hooks/useSpotlightPrefs";
import { SpotlightCarousel } from "./spotlight-carousel";
import { GameRecapCard } from "./game-recap-card";

interface HomeClientProps {
  games: Game[];
  players: Player[];
  spotlight: SpotlightPayload;
  preselectedGameId?: string;
}

/**
 * De homepage boven het logformulier.
 *
 * Waarom een client-component: de kaart bovenaan moet weten wat er in het formulier gebeurt.
 * Zonder spelkeuze is dat de spotlight-carrousel, met spelkeuze de laatste uitslagen van dat
 * spel, en op het winnaarsscherm helemaal niets. Andersom zet "Nog eens?" het spel direct in
 * het formulier — zonder de paginaherlaad die de oude ?game=-link opleverde.
 */
export function HomeClient({
  games,
  players,
  spotlight,
  preselectedGameId,
}: HomeClientProps) {
  const preselectedGame = preselectedGameId
    ? (games.find((game) => game.id === preselectedGameId) ?? null)
    : null;

  const [formState, setFormState] = useState<SessionFormState>({
    selectedGame: preselectedGame,
    step: preselectedGame ? "starter" : "game",
    activePlayerCount: 0,
  });
  const [pick, setPick] = useState<{ game: Game; nonce: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const { noteHomeVisit } = useSpotlightPrefs();

  // Je bent er geweest: de stip bij 🎮 mag weer tot morgen weg.
  useEffect(() => {
    noteHomeVisit();
  }, [noteHomeVisit]);

  const handleReplay = useCallback(
    (gameId: string) => {
      const game = games.find((candidate) => candidate.id === gameId);
      if (!game) return;
      // Nonce: hetzelfde spel twee keer achter elkaar aantikken moet ook werken.
      setPick((previous) => ({ game, nonce: (previous?.nonce ?? 0) + 1 }));
      window.setTimeout(
        () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50
      );
    },
    [games]
  );

  const { selectedGame, step, activePlayerCount } = formState;

  return (
    <>
      {/* De carrousel blijft in de DOM staan (alleen verborgen) zodat je na een potje weer
          op dezelfde kaart terugkomt in plaats van bij de eerste. */}
      {spotlight.cards.length > 0 && (
        <div hidden={step === "done" || selectedGame !== null}>
          <SpotlightCarousel
            cards={spotlight.cards}
            seed={spotlight.seed}
            playerCount={activePlayerCount}
            onReplay={handleReplay}
          />
        </div>
      )}

      {step !== "done" && selectedGame && <GameRecapCard game={selectedGame} />}

      <MarathonStartButton />

      <div ref={formRef}>
        <SessionForm
          games={games}
          players={players}
          preselectedGameId={preselectedGameId}
          gamePick={pick}
          onStateChange={setFormState}
        />
      </div>
    </>
  );
}
