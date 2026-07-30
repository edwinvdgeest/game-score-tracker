import { getGamesSortedByRecent, getPlayers, getSpotlight } from "@/lib/queries";
import { SetupBanner } from "@/components/setup-banner";
import { HomeClient } from "@/components/home/home-client";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ game?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let data: [
    Awaited<ReturnType<typeof getGamesSortedByRecent>>,
    Awaited<ReturnType<typeof getPlayers>>,
    Awaited<ReturnType<typeof getSpotlight>>,
    { game?: string },
  ];
  try {
    data = await Promise.all([
      getGamesSortedByRecent(),
      getPlayers(),
      getSpotlight(),
      searchParams,
    ]);
  } catch {
    return <SetupBanner />;
  }
  const [games, players, spotlight, resolvedParams] = data;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-black"
          style={{ color: "var(--foreground)" }}
        >
          Spelscores 🎲
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Wie wint er vandaag?
        </p>
      </div>
      {/* De kaart boven het formulier hangt af van wat er in het formulier gebeurt, dus
          zit hij samen met het formulier in één client-component. */}
      <HomeClient
        games={games}
        players={players}
        spotlight={spotlight}
        preselectedGameId={resolvedParams.game}
      />
    </div>
  );
}
