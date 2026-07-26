import { getPlayers, getHeadToHead } from "@/lib/queries";
import { SetupBanner } from "@/components/setup-banner";
import { DuelClient } from "@/components/duel/duel-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onderling duel",
};

export default async function DuelPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let players: Awaited<ReturnType<typeof getPlayers>>;
  try {
    players = await getPlayers();
  } catch {
    return <SetupBanner />;
  }

  // Gasten blijven buiten de paarkeuze: het duel gaat over de vaste rivaliteit.
  const regulars = players.filter((p) => !p.is_guest);

  // Eerste paar al op de server ophalen, zodat de pagina meteen gevuld is.
  const first = regulars[0];
  const second = regulars[1];
  let initialDuel = null;
  if (first && second) {
    try {
      initialDuel = await getHeadToHead(first.id, second.id, "all");
    } catch {
      initialDuel = null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Onderling duel ⚔️
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Wie is de baas, en bij welk spel?
        </p>
      </div>
      <DuelClient players={regulars} initialDuel={initialDuel} />
    </div>
  );
}
